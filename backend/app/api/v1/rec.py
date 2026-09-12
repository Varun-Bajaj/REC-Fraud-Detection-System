import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.fabric_rec import FabricRECRecord, FabricFraudAlert
from app.schemas.rec import (
    RECCreateRequest,
    RECTransferRequest,
    RECRetireRequest,
    RECCancelRequest,
    RECVerifyResponseSchema,
    DocumentUploadResponse,
    DocumentVerifyResponse,
    FraudAlertItem,
)
from app.services.fabric_service import FabricService
from app.services.document_hash import DocumentHashService
from app.services.fabric_fraud_engine import FabricFraudEngine

logger = logging.getLogger("rec_api")

router = APIRouter(tags=["Hyperledger Fabric REC"])


@router.post("/rec", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
def create_rec(
    payload: RECCreateRequest,
    db: Session = Depends(get_db),
):
    """
    Issues a new REC on the Hyperledger Fabric ledger via IssuerOrgMSP identity.
    Stores off-chain metadata in PostgreSQL and performs duplicate checks.
    """
    # 1. Check duplicate REC ID off-chain
    existing_rec = db.query(FabricRECRecord).filter(FabricRECRecord.rec_id == payload.recId).first()
    if existing_rec:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"REC ID '{payload.recId}' already exists in registry.",
        )

    # 2. Check duplicate document hash off-chain (Warn or flag double counting)
    existing_hash = db.query(FabricRECRecord).filter(FabricRECRecord.document_hash == payload.documentHash).first()
    if existing_hash:
        logger.warning(f"Warning: Document hash {payload.documentHash} was previously registered for {existing_hash.rec_id}")

    # 3. Submit real state-changing transaction to Hyperledger Fabric
    onchain_asset = FabricService.create_rec(
        rec_id=payload.recId,
        generator_id=payload.generatorId,
        energy_source=payload.energySource,
        generation_date=payload.generationDate,
        generation_mwh=payload.generationMWh,
        issued_quantity=payload.issuedQuantity,
        document_hash=payload.documentHash,
    )

    # 4. Save metadata off-chain in PostgreSQL
    new_record = FabricRECRecord(
        rec_id=payload.recId,
        generator_id=payload.generatorId,
        energy_source=payload.energySource,
        generation_date=payload.generationDate,
        generation_mwh=payload.generationMWh,
        issued_quantity=payload.issuedQuantity,
        document_hash=payload.documentHash,
    )
    db.add(new_record)
    db.commit()
    db.refresh(new_record)

    # 5. Run Fraud Engine evaluation
    fraud_eval = FabricFraudEngine.evaluate_rec(onchain_asset, [], db)

    return {
        "message": "REC successfully issued on Hyperledger Fabric ledger.",
        "asset": onchain_asset,
        "fraudEvaluation": fraud_eval,
    }


@router.get("/rec", response_model=List[Dict[str, Any]])
def list_recs(db: Session = Depends(get_db)):
    """
    Lists all RECs registered in the system with their cached metadata and live ledger state.
    """
    records = db.query(FabricRECRecord).order_by(FabricRECRecord.created_at.desc()).all()
    results = []
    for r in records:
        # Attempt to get live state from ledger; fallback to cached off-chain data if gateway is busy
        try:
            onchain = FabricService.get_rec(r.rec_id)
        except Exception:
            onchain = {
                "recId": r.rec_id,
                "currentOwner": "ISSUER-001",
                "activeQuantity": r.issued_quantity,
                "retiredQuantity": 0,
                "status": "ACTIVE",
            }

        results.append({
            "recId": r.rec_id,
            "generatorId": r.generator_id,
            "energySource": r.energy_source,
            "generationDate": r.generation_date,
            "generationMWh": r.generation_mwh,
            "issuedQuantity": r.issued_quantity,
            "documentHash": r.document_hash,
            "currentOwner": onchain.get("currentOwner", "UNKNOWN"),
            "activeQuantity": onchain.get("activeQuantity", r.issued_quantity),
            "retiredQuantity": onchain.get("retiredQuantity", 0),
            "status": onchain.get("status", "ACTIVE"),
            "fraudRiskScore": r.fraud_risk_score,
            "fraudRiskLevel": r.fraud_risk_level,
            "fraudReasons": r.fraud_reasons,
            "createdAt": r.created_at.isoformat() if r.created_at else "",
        })
    return results


@router.get("/rec/{recId}", response_model=Dict[str, Any])
def get_rec(recId: str, db: Session = Depends(get_db)):
    """
    Retrieves the complete on-chain REC asset from Hyperledger Fabric,
    combined with off-chain fraud intelligence.
    """
    onchain = FabricService.get_rec(recId)
    rec_record = db.query(FabricRECRecord).filter(FabricRECRecord.rec_id == recId).first()

    history = []
    try:
        history = FabricService.get_rec_history(recId)
    except Exception as e:
        logger.debug(f"Could not fetch history for fraud eval: {e}")

    fraud_eval = FabricFraudEngine.evaluate_rec(onchain, history, db)

    return {
        "asset": onchain,
        "metadata": {
            "documentFilename": rec_record.document_filename if rec_record else None,
            "storagePath": rec_record.storage_path if rec_record else None,
            "createdAt": rec_record.created_at.isoformat() if rec_record and rec_record.created_at else None,
        },
        "fraudEvaluation": fraud_eval,
    }


@router.post("/rec/{recId}/transfer", response_model=Dict[str, Any])
def transfer_rec(
    recId: str,
    payload: RECTransferRequest,
    db: Session = Depends(get_db),
):
    """
    Transfers active REC quantity on the Hyperledger Fabric ledger.
    Smart contract validates ownership, active balance, and caller identity.
    """
    updated_asset = FabricService.transfer_rec(
        rec_id=recId,
        from_owner=payload.fromOwner,
        to_owner=payload.toOwner,
        quantity=payload.quantity,
        transaction_reference=payload.transactionReference or "",
        caller_org=payload.callerOrg or "issuer",
    )

    # Re-evaluate fraud risk post-transfer
    try:
        history = FabricService.get_rec_history(recId)
        FabricFraudEngine.evaluate_rec(updated_asset, history, db)
    except Exception as e:
        logger.debug(f"History fetch error during transfer: {e}")

    return {
        "message": f"Successfully transferred {payload.quantity} REC units to {payload.toOwner}.",
        "asset": updated_asset,
    }


@router.post("/rec/{recId}/retire", response_model=Dict[str, Any])
def retire_rec(
    recId: str,
    payload: RECRetireRequest,
    db: Session = Depends(get_db),
):
    """
    Retires active REC units on the Hyperledger Fabric ledger.
    Once retired, certificates can NEVER become active again.
    """
    updated_asset = FabricService.retire_rec(
        rec_id=recId,
        owner=payload.owner,
        quantity=payload.quantity,
        retirement_reason=payload.retirementReason or "Scope 2 Carbon Offset",
        caller_org=payload.callerOrg or "buyer",
    )

    # Re-evaluate fraud risk post-retire
    try:
        history = FabricService.get_rec_history(recId)
        FabricFraudEngine.evaluate_rec(updated_asset, history, db)
    except Exception as e:
        logger.debug(f"History fetch error during retire: {e}")

    return {
        "message": f"Successfully retired {payload.quantity} REC units for owner {payload.owner}.",
        "asset": updated_asset,
    }


@router.post("/rec/{recId}/cancel", response_model=Dict[str, Any])
def cancel_rec(
    recId: str,
    payload: RECCancelRequest,
    db: Session = Depends(get_db),
):
    """
    Cancels a REC on the Hyperledger Fabric ledger.
    Restricted to authorized RegulatorOrgMSP or IssuerOrgMSP identities.
    """
    updated_asset = FabricService.cancel_rec(
        rec_id=recId,
        reason=payload.reason or "Regulatory Directive",
        caller_org=payload.callerOrg or "regulator",
    )

    # Re-evaluate fraud risk post-cancellation
    try:
        history = FabricService.get_rec_history(recId)
        FabricFraudEngine.evaluate_rec(updated_asset, history, db)
    except Exception as e:
        logger.debug(f"History fetch error during cancel: {e}")

    return {
        "message": f"REC {recId} has been CANCELLED on the distributed ledger.",
        "asset": updated_asset,
    }


@router.get("/rec/{recId}/history", response_model=Dict[str, Any])
def get_rec_history(recId: str):
    """
    Retrieves the complete immutable block modification history from Hyperledger Fabric.
    Shows CREATED -> TRANSFERRED -> RETIRED lifecycle timeline with transaction IDs and timestamps.
    """
    history = FabricService.get_rec_history(recId)
    return {
        "recId": recId,
        "totalEvents": len(history),
        "history": history,
    }


@router.get("/rec/{recId}/verify", response_model=Dict[str, Any])
def verify_rec(recId: str, db: Session = Depends(get_db)):
    """
    Performs on-chain verification of REC state, balance conservation,
    and cross-references with off-chain fraud alerts.
    """
    onchain_verify = FabricService.verify_rec(recId)
    rec_record = db.query(FabricRECRecord).filter(FabricRECRecord.rec_id == recId).first()

    return {
        "recId": recId,
        "onchainVerification": onchain_verify,
        "fraudRiskScore": rec_record.fraud_risk_score if rec_record else 0.0,
        "fraudRiskLevel": rec_record.fraud_risk_level if rec_record else "LOW",
        "fraudReasons": rec_record.fraud_reasons if rec_record else [],
    }


@router.post("/documents/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
):
    """
    Receives verification proof PDF off-chain, computes SHA-256 cryptographic digest,
    and returns documentHash. The actual file stays off-chain; only the hash goes on-chain.
    """
    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    doc_hash = DocumentHashService.calculate_sha256(file_bytes)
    storage_path = DocumentHashService.save_document(file_bytes, file.filename or "document.pdf")

    return DocumentUploadResponse(
        file_name=file.filename or "document.pdf",
        document_hash=doc_hash,
        file_size_bytes=len(file_bytes),
        storage_path=storage_path,
        message="Document stored off-chain. SHA-256 fingerprint generated for Hyperledger Fabric recording.",
    )


@router.post("/rec/{recId}/verify-document", response_model=DocumentVerifyResponse)
async def verify_document(
    recId: str,
    file: UploadFile = File(...),
):
    """
    Verifies document integrity against the on-chain SHA-256 hash registered with the REC.
    Matches SHA-256 bytes to detect unauthorized modification or tampering.
    """
    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded document is empty.",
        )

    computed_hash = DocumentHashService.calculate_sha256(file_bytes)

    # Retrieve on-chain REC
    onchain = FabricService.get_rec(recId)
    registered_hash = onchain.get("documentHash", "")

    is_match = (computed_hash.lower() == registered_hash.lower())

    if is_match:
        return DocumentVerifyResponse(
            match=True,
            status="DOCUMENT VERIFIED",
            message="Document byte integrity matches the immutable on-chain SHA-256 hash registered with this REC.",
            computed_hash=computed_hash,
            registered_hash=registered_hash,
            disclaimer="Cryptographic match verifies byte-level integrity against the registered hash; legal validity requires authorized issuing body audit.",
        )
    else:
        return DocumentVerifyResponse(
            match=False,
            status="DOCUMENT INTEGRITY FAILURE",
            message="Document SHA-256 hash does NOT match the registered blockchain hash! File has been altered or replaced.",
            computed_hash=computed_hash,
            registered_hash=registered_hash,
            disclaimer="Integrity check failed: bytes differ from the fingerprint committed to the Hyperledger Fabric ledger.",
        )


@router.get("/fraud/alerts", response_model=List[Dict[str, Any]])
def get_fraud_alerts(db: Session = Depends(get_db)):
    """
    Retrieves all active fraud alerts, double-counting detections, and anomalies.
    """
    return FabricFraudEngine.get_all_alerts(db)
