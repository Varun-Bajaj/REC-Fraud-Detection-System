import logging
from typing import Dict, Any, List, Optional
import httpx
from fastapi import HTTPException, status

from app.config import settings

logger = logging.getLogger("fabric_service")


class FabricService:
    """
    Client service communicating with the Hyperledger Fabric Gateway bridge.
    Executes real transactions and evaluations on the RECContract chaincode.
    """

    @classmethod
    def _gateway_url(cls) -> str:
        return settings.FABRIC_GATEWAY_URL.rstrip("/")

    @classmethod
    def check_health(cls) -> Dict[str, Any]:
        """Queries health status of the Fabric network and chaincode."""
        try:
            with httpx.Client(timeout=5.0) as client:
                res = client.get(f"{cls._gateway_url()}/health")
                if res.status_code == 200:
                    return res.json()
                return {"status": "UNAVAILABLE", "detail": res.text}
        except Exception as e:
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
    ) -> Dict[str, Any]:
        """Issues a new REC on the distributed ledger via IssuerOrgMSP."""
        payload = {
            "recId": rec_id,
            "generatorId": generator_id,
            "energySource": energy_source,
            "generationDate": generation_date,
            "generationMWh": generation_mwh,
            "issuedQuantity": issued_quantity,
            "documentHash": document_hash,
        }
        try:
            with httpx.Client(timeout=30.0) as client:
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
        payload = {
            "recId": rec_id,
            "fromOwner": from_owner,
            "toOwner": to_owner,
            "quantity": quantity,
            "transactionReference": transaction_reference,
            "callerOrg": caller_org,
        }
        try:
            with httpx.Client(timeout=30.0) as client:
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
        payload = {
            "recId": rec_id,
            "owner": owner,
            "quantity": quantity,
            "retirementReason": retirement_reason,
            "callerOrg": caller_org,
        }
        try:
            with httpx.Client(timeout=30.0) as client:
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
        payload = {
            "recId": rec_id,
            "reason": reason,
            "callerOrg": caller_org,
        }
        try:
            with httpx.Client(timeout=30.0) as client:
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
        except Exception as e:
            logger.error(f"Fabric cancel_rec failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Fabric gateway communication failure: {e}",
            )

    @classmethod
    def get_rec(cls, rec_id: str) -> Dict[str, Any]:
        """Retrieves on-chain REC asset state."""
        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.get(f"{cls._gateway_url()}/api/fabric/rec/{rec_id}")
                if res.status_code != 200:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"REC {rec_id} not found on Hyperledger Fabric ledger.",
                    )
                return res.json().get("asset", {})
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Fabric get_rec failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Fabric gateway communication failure: {e}",
            )

    @classmethod
    def get_rec_history(cls, rec_id: str) -> List[Dict[str, Any]]:
        """Retrieves complete chronological ledger history for a REC."""
        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.get(f"{cls._gateway_url()}/api/fabric/rec/{rec_id}/history")
                if res.status_code != 200:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"History for REC {rec_id} not found on ledger.",
                    )
                return res.json().get("history", [])
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Fabric get_rec_history failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Fabric gateway communication failure: {e}",
            )

    @classmethod
    def verify_rec(cls, rec_id: str) -> Dict[str, Any]:
        """Cryptographically verifies REC consistency on the ledger."""
        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.get(f"{cls._gateway_url()}/api/fabric/rec/{rec_id}/verify")
                if res.status_code != 200:
                    return {"valid": False, "status": "QUERY_ERROR", "message": res.text}
                return res.json().get("verification", {})
        except Exception as e:
            logger.error(f"Fabric verify_rec failed: {e}")
            return {"valid": False, "status": "GATEWAY_OFFLINE", "message": str(e)}
