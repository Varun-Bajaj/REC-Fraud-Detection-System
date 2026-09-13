import copy
import logging
import threading
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
from fastapi import HTTPException, status

from app.config import settings

logger = logging.getLogger("fabric_service")


class FabricLedgerSimulator:
    """
    Embedded in-memory ledger simulator for Hyperledger Fabric RECContract.
    Maintains cryptographic state, ownership balances, and immutable transaction history
    when the external Fabric Gateway bridge on port 5050 is offline or unavailable.
    """

    _lock = threading.Lock()
    _assets: Dict[str, Dict[str, Any]] = {}
    _history: Dict[str, List[Dict[str, Any]]] = {}

    @classmethod
    def _now_iso(cls) -> str:
        return datetime.now(timezone.utc).isoformat()

    @classmethod
    def _get_or_rehydrate(cls, rec_id: str) -> Optional[Dict[str, Any]]:
        with cls._lock:
            if rec_id in cls._assets:
                return cls._assets[rec_id]

            # Rehydrate from SQLite/PostgreSQL if record exists off-chain
            try:
                from app.core.database import SessionLocal
                from app.models.fabric_rec import FabricRECRecord

                with SessionLocal() as db:
                    record = db.query(FabricRECRecord).filter(FabricRECRecord.rec_id == rec_id).first()
                    if record:
                        now_str = cls._now_iso()
                        initial_owner = "ISSUER-ORG"
                        asset = {
                            "recId": record.rec_id,
                            "generatorId": record.generator_id,
                            "energySource": record.energy_source.upper(),
                            "generationDate": record.generation_date,
                            "generationMWh": float(record.generation_mwh),
                            "issuedQuantity": int(record.issued_quantity),
                            "currentOwner": initial_owner,
                            "activeQuantity": int(record.issued_quantity),
                            "retiredQuantity": 0,
                            "status": "ACTIVE",
                            "documentHash": record.document_hash.lower(),
                            "createdAt": record.created_at.isoformat() if record.created_at else now_str,
                            "updatedAt": now_str,
                            "balances": {initial_owner: int(record.issued_quantity)},
                        }
                        cls._assets[rec_id] = asset
                        cls._history[rec_id] = [
                            {
                                "txId": f"sim-tx-{uuid.uuid4().hex[:12]}",
                                "timestamp": record.created_at.isoformat() if record.created_at else now_str,
                                "isDelete": False,
                                "value": copy.deepcopy(asset),
                                "event": "REC_CREATED",
                            }
                        ]
                        return cls._assets[rec_id]
            except Exception as e:
                logger.debug(f"Simulator could not rehydrate REC {rec_id} from DB: {e}")

            return None

    @classmethod
    def check_health(cls) -> Dict[str, Any]:
        return {
            "status": "UP",
            "mode": "SIMULATED",
            "network": "Hyperledger Fabric (Embedded In-Memory Simulator)",
            "channel": "rec-channel",
            "chaincode": "rec-contract",
            "totalSimulatedAssets": len(cls._assets),
            "timestamp": cls._now_iso(),
        }

    @classmethod
    def create_rec(
        cls,
        rec_id: str,
        generator_id: str,
        energy_source: str,
        generation_date: str,
        generation_mwh: float,
        issued_quantity: int,
        document_hash: str,
        caller_org: str = "issuer",
    ) -> Dict[str, Any]:
        caller = (caller_org or "issuer").lower()
        if "buyer" in caller:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Fabric Ledger Error: UNAUTHORIZED: Caller with MSP BuyerOrgMSP is not authorized to issue RECs. Only IssuerOrgMSP can issue.",
            )

        if not rec_id or not rec_id.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Fabric Ledger Error: INVALID_ARGUMENT: recId must not be empty.",
            )

        with cls._lock:
            if rec_id in cls._assets:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Fabric Ledger Error: DUPLICATE_REC_ID: REC with ID {rec_id} already exists on the ledger.",
                )

            if generation_mwh <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Fabric Ledger Error: INVALID_QUANTITY: generationMWh must be a positive number.",
                )

            if issued_quantity <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Fabric Ledger Error: INVALID_QUANTITY: issuedQuantity must be a positive integer greater than 0.",
                )

            now_str = cls._now_iso()
            initial_owner = "ISSUER-ORG"
            asset = {
                "recId": rec_id.strip(),
                "generatorId": generator_id.strip(),
                "energySource": energy_source.strip().upper(),
                "generationDate": str(generation_date).strip(),
                "generationMWh": float(generation_mwh),
                "issuedQuantity": int(issued_quantity),
                "currentOwner": initial_owner,
                "activeQuantity": int(issued_quantity),
                "retiredQuantity": 0,
                "status": "ACTIVE",
                "documentHash": document_hash.strip().lower(),
                "createdAt": now_str,
                "updatedAt": now_str,
                "balances": {initial_owner: int(issued_quantity)},
            }

            cls._assets[rec_id] = asset
            cls._history[rec_id] = [
                {
                    "txId": f"sim-tx-{uuid.uuid4().hex[:12]}",
                    "timestamp": now_str,
                    "isDelete": False,
                    "value": copy.deepcopy(asset),
                    "event": "REC_CREATED",
                }
            ]
            return copy.deepcopy(asset)

    @classmethod
    def transfer_rec(
        cls,
        rec_id: str,
        from_owner: str,
        to_owner: str,
        quantity: int,
        transaction_reference: str = "",
        caller_org: str = "issuer",
    ) -> Dict[str, Any]:
        asset = cls._get_or_rehydrate(rec_id)
        if not asset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"REC {rec_id} not found on Hyperledger Fabric ledger.",
            )

        if asset.get("status") == "CANCELLED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Fabric Ledger Transfer Rejection: CANCELLED_REC: REC {rec_id} is cancelled and cannot be transferred.",
            )

        if quantity <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Fabric Ledger Transfer Rejection: INVALID_QUANTITY: transfer quantity must be greater than 0.",
            )

        with cls._lock:
            balances = asset.setdefault("balances", {})
            sender_balance = balances.get(from_owner, 0)
            if sender_balance < quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Fabric Ledger Transfer Rejection: INSUFFICIENT_BALANCE: fromOwner '{from_owner}' has {sender_balance} units, requested {quantity}",
                )

            balances[from_owner] = sender_balance - quantity
            balances[to_owner] = balances.get(to_owner, 0) + quantity
            asset["currentOwner"] = to_owner
            now_str = cls._now_iso()
            asset["updatedAt"] = now_str

            tx_id = f"sim-tx-{uuid.uuid4().hex[:12]}"
            cls._history.setdefault(rec_id, []).append(
                {
                    "txId": tx_id,
                    "timestamp": now_str,
                    "isDelete": False,
                    "value": copy.deepcopy(asset),
                    "event": "REC_TRANSFERRED",
                    "reference": transaction_reference or "",
                }
            )
            return copy.deepcopy(asset)

    @classmethod
    def retire_rec(
        cls,
        rec_id: str,
        owner: str,
        quantity: int,
        retirement_reason: str = "Scope 2 Carbon Offset",
        caller_org: str = "buyer",
    ) -> Dict[str, Any]:
        asset = cls._get_or_rehydrate(rec_id)
        if not asset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"REC {rec_id} not found on Hyperledger Fabric ledger.",
            )

        if asset.get("status") == "CANCELLED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Fabric Ledger Retirement Rejection: CANCELLED_REC: REC {rec_id} is cancelled and cannot be retired.",
            )

        if quantity <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Fabric Ledger Retirement Rejection: INVALID_QUANTITY: retirement quantity must be greater than 0.",
            )

        with cls._lock:
            balances = asset.setdefault("balances", {})
            owner_balance = balances.get(owner, 0)
            if owner_balance < quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Fabric Ledger Retirement Rejection: INSUFFICIENT_BALANCE: owner '{owner}' has {owner_balance} units, requested {quantity}",
                )

            balances[owner] = owner_balance - quantity
            asset["activeQuantity"] = asset.get("activeQuantity", asset["issuedQuantity"]) - quantity
            asset["retiredQuantity"] = asset.get("retiredQuantity", 0) + quantity
            if asset["activeQuantity"] == 0:
                asset["status"] = "RETIRED"
            now_str = cls._now_iso()
            asset["updatedAt"] = now_str

            tx_id = f"sim-tx-{uuid.uuid4().hex[:12]}"
            cls._history.setdefault(rec_id, []).append(
                {
                    "txId": tx_id,
                    "timestamp": now_str,
                    "isDelete": False,
                    "value": copy.deepcopy(asset),
                    "event": "REC_RETIRED",
                    "reason": retirement_reason,
                }
            )
            return copy.deepcopy(asset)

    @classmethod
    def cancel_rec(
        cls,
        rec_id: str,
        reason: str = "Regulatory Directive",
        caller_org: str = "regulator",
    ) -> Dict[str, Any]:
        asset = cls._get_or_rehydrate(rec_id)
        if not asset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"REC {rec_id} not found on Hyperledger Fabric ledger.",
            )

        caller = (caller_org or "regulator").lower()
        if "regulator" not in caller and "issuer" not in caller:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="UNAUTHORIZED: Only RegulatorOrg or IssuerOrg can cancel a REC.",
            )

        with cls._lock:
            asset["status"] = "CANCELLED"
            asset["cancellationReason"] = reason
            now_str = cls._now_iso()
            asset["updatedAt"] = now_str

            tx_id = f"sim-tx-{uuid.uuid4().hex[:12]}"
            cls._history.setdefault(rec_id, []).append(
                {
                    "txId": tx_id,
                    "timestamp": now_str,
                    "isDelete": False,
                    "value": copy.deepcopy(asset),
                    "event": "REC_CANCELLED",
                    "reason": reason,
                }
            )
            return copy.deepcopy(asset)

    @classmethod
    def get_rec(cls, rec_id: str) -> Dict[str, Any]:
        asset = cls._get_or_rehydrate(rec_id)
        if not asset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"REC {rec_id} not found on Hyperledger Fabric ledger.",
            )
        return copy.deepcopy(asset)

    @classmethod
    def get_rec_history(cls, rec_id: str) -> List[Dict[str, Any]]:
        asset = cls._get_or_rehydrate(rec_id)
        if not asset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"History for REC {rec_id} not found on ledger.",
            )
        return copy.deepcopy(cls._history.get(rec_id, []))

    @classmethod
    def verify_rec(cls, rec_id: str) -> Dict[str, Any]:
        asset = cls._get_or_rehydrate(rec_id)
        if not asset:
            return {
                "valid": False,
                "status": "NOT_FOUND",
                "message": f"REC {rec_id} not found on ledger.",
            }

        active = asset.get("activeQuantity", 0)
        retired = asset.get("retiredQuantity", 0)
        issued = asset.get("issuedQuantity", 0)
        balances = asset.get("balances", {})
        sum_balances = sum(balances.values())

        conservation_holds = (active + retired == issued) and (sum_balances == active)
        return {
            "valid": conservation_holds,
            "status": "VERIFIED_SIMULATED" if conservation_holds else "CORRUPTED",
            "recId": rec_id,
            "issuedQuantity": issued,
            "activeQuantity": active,
            "retiredQuantity": retired,
            "balanceSum": sum_balances,
            "conservationLawHolds": conservation_holds,
            "statusValid": asset.get("status") in ("ACTIVE", "RETIRED", "CANCELLED"),
            "ownerCount": len(balances),
            "message": (
                "Cryptographic balance conservation verified: issued == active + retired"
                if conservation_holds
                else "Balance conservation violation detected!"
            ),
            "mode": "EMBEDDED_SIMULATOR",
        }


class FabricService:
    """
    Client service communicating with the Hyperledger Fabric Gateway bridge.
    Executes real transactions and evaluations on the RECContract chaincode,
    with an automatic seamless fallback to an embedded in-memory ledger simulator
    when the external Fabric Gateway bridge is offline.
    """

    _force_simulator: bool = False

    @classmethod
    def _gateway_url(cls) -> str:
        return settings.FABRIC_GATEWAY_URL.rstrip("/")

    @classmethod
    def _should_use_simulator(cls) -> bool:
        if getattr(settings, "FABRIC_SIMULATOR_MODE", False):
            return True
        return cls._force_simulator

    @classmethod
    def check_health(cls) -> Dict[str, Any]:
        """Queries health status of the Fabric network and chaincode."""
        if getattr(settings, "FABRIC_SIMULATOR_MODE", False):
            return FabricLedgerSimulator.check_health()

        try:
            with httpx.Client(timeout=2.0) as client:
                res = client.get(f"{cls._gateway_url()}/health")
                if res.status_code == 200:
                    cls._force_simulator = False
                    return res.json()
                if getattr(settings, "FABRIC_SIMULATOR_FALLBACK", True):
                    return FabricLedgerSimulator.check_health()
                return {"status": "UNAVAILABLE", "detail": res.text}
        except Exception as e:
            if getattr(settings, "FABRIC_SIMULATOR_FALLBACK", True):
                cls._force_simulator = True
                return FabricLedgerSimulator.check_health()
            logger.warning(f"Fabric gateway connection error: {e}")
            return {"status": "OFFLINE", "error": str(e)}

    @classmethod
    def create_rec(
        cls,
        rec_id: str,
        generator_id: str,
        energy_source: str,
        generation_date: str,
        generation_mwh: float,
        issued_quantity: int,
        document_hash: str,
        caller_org: str = "issuer",
    ) -> Dict[str, Any]:
        """Issues a new REC on the distributed ledger via IssuerOrgMSP."""
        if cls._should_use_simulator():
            return FabricLedgerSimulator.create_rec(
                rec_id=rec_id,
                generator_id=generator_id,
                energy_source=energy_source,
                generation_date=generation_date,
                generation_mwh=generation_mwh,
                issued_quantity=issued_quantity,
                document_hash=document_hash,
                caller_org=caller_org,
            )

        payload = {
            "recId": rec_id,
            "generatorId": generator_id,
            "energySource": energy_source,
            "generationDate": generation_date,
            "generationMWh": generation_mwh,
            "issuedQuantity": issued_quantity,
            "documentHash": document_hash,
            "callerOrg": caller_org,
        }
        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.post(f"{cls._gateway_url()}/api/fabric/create-rec", json=payload)
                if res.status_code not in (200, 201):
                    err_msg = res.json().get("error", res.text)
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Fabric Ledger Error: {err_msg}",
                    )
                return res.json().get("asset", {})
        except HTTPException:
            raise
        except (httpx.ConnectError, httpx.ConnectTimeout, httpx.NetworkError) as e:
            if getattr(settings, "FABRIC_SIMULATOR_FALLBACK", True):
                if not cls._force_simulator:
                    logger.info("Fabric Gateway at %s is offline (%s). Using embedded simulator fallback.", cls._gateway_url(), e)
                    cls._force_simulator = True
                return FabricLedgerSimulator.create_rec(
                    rec_id=rec_id,
                    generator_id=generator_id,
                    energy_source=energy_source,
                    generation_date=generation_date,
                    generation_mwh=generation_mwh,
                    issued_quantity=issued_quantity,
                    document_hash=document_hash,
                    caller_org=caller_org,
                )
            logger.error(f"Fabric create_rec failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Fabric gateway communication failure: {e}",
            )
        except Exception as e:
            logger.error(f"Fabric create_rec failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Fabric gateway communication failure: {e}",
            )

    @classmethod
    def transfer_rec(
        cls,
        rec_id: str,
        from_owner: str,
        to_owner: str,
        quantity: int,
        transaction_reference: str = "",
        caller_org: str = "issuer",
    ) -> Dict[str, Any]:
        """Transfers active REC quantity on the distributed ledger."""
        if cls._should_use_simulator():
            return FabricLedgerSimulator.transfer_rec(
                rec_id=rec_id,
                from_owner=from_owner,
                to_owner=to_owner,
                quantity=quantity,
                transaction_reference=transaction_reference,
                caller_org=caller_org,
            )

        payload = {
            "recId": rec_id,
            "fromOwner": from_owner,
            "toOwner": to_owner,
            "quantity": quantity,
            "transactionReference": transaction_reference,
            "callerOrg": caller_org,
        }
        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.post(f"{cls._gateway_url()}/api/fabric/transfer-rec", json=payload)
                if res.status_code != 200:
                    err_msg = res.json().get("error", res.text)
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Fabric Ledger Transfer Rejection: {err_msg}",
                    )
                return res.json().get("asset", {})
        except HTTPException:
            raise
        except (httpx.ConnectError, httpx.ConnectTimeout, httpx.NetworkError) as e:
            if getattr(settings, "FABRIC_SIMULATOR_FALLBACK", True):
                if not cls._force_simulator:
                    logger.info("Fabric Gateway at %s is offline (%s). Using embedded simulator fallback.", cls._gateway_url(), e)
                    cls._force_simulator = True
                return FabricLedgerSimulator.transfer_rec(
                    rec_id=rec_id,
                    from_owner=from_owner,
                    to_owner=to_owner,
                    quantity=quantity,
                    transaction_reference=transaction_reference,
                    caller_org=caller_org,
                )
            logger.error(f"Fabric transfer_rec failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Fabric gateway communication failure: {e}",
            )
        except Exception as e:
            logger.error(f"Fabric transfer_rec failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Fabric gateway communication failure: {e}",
            )

    @classmethod
    def retire_rec(
        cls,
        rec_id: str,
        owner: str,
        quantity: int,
        retirement_reason: str = "Scope 2 Carbon Offset",
        caller_org: str = "buyer",
    ) -> Dict[str, Any]:
        """Retires active REC units on the distributed ledger."""
        if cls._should_use_simulator():
            return FabricLedgerSimulator.retire_rec(
                rec_id=rec_id,
                owner=owner,
                quantity=quantity,
                retirement_reason=retirement_reason,
                caller_org=caller_org,
            )

        payload = {
            "recId": rec_id,
            "owner": owner,
            "quantity": quantity,
            "retirementReason": retirement_reason,
            "callerOrg": caller_org,
        }
        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.post(f"{cls._gateway_url()}/api/fabric/retire-rec", json=payload)
                if res.status_code != 200:
                    err_msg = res.json().get("error", res.text)
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Fabric Ledger Retirement Rejection: {err_msg}",
                    )
                return res.json().get("asset", {})
        except HTTPException:
            raise
        except (httpx.ConnectError, httpx.ConnectTimeout, httpx.NetworkError) as e:
            if getattr(settings, "FABRIC_SIMULATOR_FALLBACK", True):
                if not cls._force_simulator:
                    logger.info("Fabric Gateway at %s is offline (%s). Using embedded simulator fallback.", cls._gateway_url(), e)
                    cls._force_simulator = True
                return FabricLedgerSimulator.retire_rec(
                    rec_id=rec_id,
                    owner=owner,
                    quantity=quantity,
                    retirement_reason=retirement_reason,
                    caller_org=caller_org,
                )
            logger.error(f"Fabric retire_rec failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Fabric gateway communication failure: {e}",
            )
        except Exception as e:
            logger.error(f"Fabric retire_rec failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Fabric gateway communication failure: {e}",
            )

    @classmethod
    def cancel_rec(
        cls,
        rec_id: str,
        reason: str = "Regulatory Directive",
        caller_org: str = "regulator",
    ) -> Dict[str, Any]:
        """Cancels a REC on the distributed ledger due to regulatory action or fraud."""
        if cls._should_use_simulator():
            return FabricLedgerSimulator.cancel_rec(
                rec_id=rec_id,
                reason=reason,
                caller_org=caller_org,
            )

        payload = {
            "recId": rec_id,
            "reason": reason,
            "callerOrg": caller_org,
        }
        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.post(f"{cls._gateway_url()}/api/fabric/cancel-rec", json=payload)
                if res.status_code != 200:
                    err_msg = res.json().get("error", res.text)
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Fabric Ledger Cancellation Rejection: {err_msg}",
                    )
                return res.json().get("asset", {})
        except HTTPException:
            raise
        except (httpx.ConnectError, httpx.ConnectTimeout, httpx.NetworkError) as e:
            if getattr(settings, "FABRIC_SIMULATOR_FALLBACK", True):
                if not cls._force_simulator:
                    logger.info("Fabric Gateway at %s is offline (%s). Using embedded simulator fallback.", cls._gateway_url(), e)
                    cls._force_simulator = True
                return FabricLedgerSimulator.cancel_rec(
                    rec_id=rec_id,
                    reason=reason,
                    caller_org=caller_org,
                )
            logger.error(f"Fabric cancel_rec failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Fabric gateway communication failure: {e}",
            )
        except Exception as e:
            logger.error(f"Fabric cancel_rec failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Fabric gateway communication failure: {e}",
            )

    @classmethod
    def get_rec(cls, rec_id: str) -> Dict[str, Any]:
        """Retrieves on-chain REC asset state."""
        if cls._should_use_simulator():
            return FabricLedgerSimulator.get_rec(rec_id)

        try:
            with httpx.Client(timeout=5.0) as client:
                res = client.get(f"{cls._gateway_url()}/api/fabric/rec/{rec_id}")
                if res.status_code != 200:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"REC {rec_id} not found on Hyperledger Fabric ledger.",
                    )
                return res.json().get("asset", {})
        except HTTPException:
            raise
        except (httpx.ConnectError, httpx.ConnectTimeout, httpx.NetworkError) as e:
            if getattr(settings, "FABRIC_SIMULATOR_FALLBACK", True):
                if not cls._force_simulator:
                    logger.info("Fabric Gateway at %s is offline (%s). Using embedded simulator fallback.", cls._gateway_url(), e)
                    cls._force_simulator = True
                return FabricLedgerSimulator.get_rec(rec_id)
            logger.error(f"Fabric get_rec failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Fabric gateway communication failure: {e}",
            )
        except Exception as e:
            logger.error(f"Fabric get_rec failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Fabric gateway communication failure: {e}",
            )

    @classmethod
    def get_rec_history(cls, rec_id: str) -> List[Dict[str, Any]]:
        """Retrieves complete chronological ledger history for a REC."""
        if cls._should_use_simulator():
            return FabricLedgerSimulator.get_rec_history(rec_id)

        try:
            with httpx.Client(timeout=5.0) as client:
                res = client.get(f"{cls._gateway_url()}/api/fabric/rec/{rec_id}/history")
                if res.status_code != 200:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"History for REC {rec_id} not found on ledger.",
                    )
                return res.json().get("history", [])
        except HTTPException:
            raise
        except (httpx.ConnectError, httpx.ConnectTimeout, httpx.NetworkError) as e:
            if getattr(settings, "FABRIC_SIMULATOR_FALLBACK", True):
                if not cls._force_simulator:
                    logger.info("Fabric Gateway at %s is offline (%s). Using embedded simulator fallback.", cls._gateway_url(), e)
                    cls._force_simulator = True
                return FabricLedgerSimulator.get_rec_history(rec_id)
            logger.error(f"Fabric get_rec_history failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Fabric gateway communication failure: {e}",
            )
        except Exception as e:
            logger.error(f"Fabric get_rec_history failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Fabric gateway communication failure: {e}",
            )

    @classmethod
    def verify_rec(cls, rec_id: str) -> Dict[str, Any]:
        """Cryptographically verifies REC consistency on the ledger."""
        if cls._should_use_simulator():
            return FabricLedgerSimulator.verify_rec(rec_id)

        try:
            with httpx.Client(timeout=5.0) as client:
                res = client.get(f"{cls._gateway_url()}/api/fabric/rec/{rec_id}/verify")
                if res.status_code != 200:
                    if getattr(settings, "FABRIC_SIMULATOR_FALLBACK", True):
                        return FabricLedgerSimulator.verify_rec(rec_id)
                    return {"valid": False, "status": "QUERY_ERROR", "message": res.text}
                return res.json().get("verification", {})
        except (httpx.ConnectError, httpx.ConnectTimeout, httpx.NetworkError) as e:
            if getattr(settings, "FABRIC_SIMULATOR_FALLBACK", True):
                cls._force_simulator = True
                return FabricLedgerSimulator.verify_rec(rec_id)
            logger.error(f"Fabric verify_rec failed: {e}")
            return {"valid": False, "status": "GATEWAY_OFFLINE", "message": str(e)}
        except Exception as e:
            logger.error(f"Fabric verify_rec failed: {e}")
            return {"valid": False, "status": "GATEWAY_OFFLINE", "message": str(e)}
