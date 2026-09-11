import hashlib
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.certificate import Certificate, CertificateTransfer, CertificateStatus, TransferType
from app.models.ledger import LedgerEventType
from app.engines.ledger_engine import LedgerEngine
from app.schemas.certificate import (
    CertificateResponse,
    CertificateTransferCreate,
    CertificateTransferResponse,
    CertificateProvenanceResponse,
)

router = APIRouter(prefix="/certificates", tags=["Certificates (RECs)"])


@router.get("/", response_model=List[CertificateResponse])
def list_certificates(
    owner_id: Optional[int] = None,
    status_filter: Optional[CertificateStatus] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List renewable energy certificates."""
    query = db.query(Certificate)
    if owner_id:
        query = query.filter(Certificate.current_owner_id == owner_id)
    elif current_user.role == UserRole.GENERATOR:
        query = query.filter(Certificate.current_owner_id == current_user.id)
    if status_filter:
        query = query.filter(Certificate.status == status_filter)

    return query.order_by(Certificate.issuance_date.desc()).offset(skip).limit(limit).all()


@router.get("/{cert_id}/provenance", response_model=CertificateProvenanceResponse)
def get_certificate_provenance(
    cert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve complete provenance and transfer lineage for a certificate."""
    cert = db.query(Certificate).filter(Certificate.id == cert_id).first()
    if not cert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificate not found.")

    transfers = (
        db.query(CertificateTransfer)
        .filter(CertificateTransfer.certificate_id == cert.id)
        .order_by(CertificateTransfer.timestamp.asc())
        .all()
    )

    return CertificateProvenanceResponse(
        certificate=cert,
        lifecycle_transfers=transfers,
    )


@router.post("/{cert_id}/transfer", response_model=CertificateTransferResponse)
def transfer_certificate(
    cert_id: int,
    transfer_in: CertificateTransferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Transfer certificate ownership to another account."""
    cert = db.query(Certificate).filter(Certificate.id == cert_id).first()
    if not cert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificate not found.")

    if cert.status != CertificateStatus.ISSUED and cert.status != CertificateStatus.TRANSFERRED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Certificate cannot be transferred because its status is {cert.status.value}.",
        )

    if cert.current_owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not own this certificate.",
        )

    recipient = db.query(User).filter(User.id == transfer_in.to_user_id).first()
    if not recipient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipient user account not found.")

    now = datetime.now(timezone.utc)
    tx_hash = hashlib.sha256(
        f"{cert.certificate_uid}_FROM_{current_user.id}_TO_{recipient.id}_{now.isoformat()}".encode()
    ).hexdigest()

    transfer = CertificateTransfer(
        certificate_id=cert.id,
        from_user_id=current_user.id,
        to_user_id=recipient.id,
        transfer_type=TransferType.TRANSFER,
        timestamp=now,
        tx_hash=tx_hash,
    )
    db.add(transfer)

    # Update certificate state
    cert.current_owner_id = recipient.id
    cert.status = CertificateStatus.TRANSFERRED

    # Record event in ledger
    LedgerEngine.record_event(
        db=db,
        event_type=LedgerEventType.CERTIFICATE_TRANSFERRED,
        entity_type="CERTIFICATE",
        entity_id=cert.certificate_uid,
        data_payload={
            "certificate_uid": cert.certificate_uid,
            "from_user_id": current_user.id,
            "to_user_id": recipient.id,
            "mwh": cert.mwh,
            "tx_hash": tx_hash,
        },
    )

    db.commit()
    db.refresh(transfer)
    return transfer


@router.post("/{cert_id}/redeem", response_model=CertificateResponse)
def redeem_certificate(
    cert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retire / Redeem certificate.
    Permanently takes the certificate out of circulation to prevent double-counting.
    """
    cert = db.query(Certificate).filter(Certificate.id == cert_id).first()
    if not cert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificate not found.")

    if cert.status == CertificateStatus.REDEEMED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Certificate is already redeemed.")

    if cert.current_owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this certificate.")

    now = datetime.now(timezone.utc)
    cert.status = CertificateStatus.REDEEMED

    tx_hash = hashlib.sha256(
        f"{cert.certificate_uid}_REDEEMED_{current_user.id}_{now.isoformat()}".encode()
    ).hexdigest()

    retirement_tx = CertificateTransfer(
        certificate_id=cert.id,
        from_user_id=current_user.id,
        to_user_id=current_user.id,
        transfer_type=TransferType.RETIREMENT,
        timestamp=now,
        tx_hash=tx_hash,
    )
    db.add(retirement_tx)

    # Record on ledger
    LedgerEngine.record_event(
        db=db,
        event_type=LedgerEventType.CERTIFICATE_REDEEMED,
        entity_type="CERTIFICATE",
        entity_id=cert.certificate_uid,
        data_payload={
            "certificate_uid": cert.certificate_uid,
            "redeemed_by_user_id": current_user.id,
            "mwh": cert.mwh,
            "tx_hash": tx_hash,
        },
    )

    db.commit()
    db.refresh(cert)
    return cert
