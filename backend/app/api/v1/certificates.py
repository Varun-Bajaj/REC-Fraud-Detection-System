import hashlib
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.certificate import Certificate, CertificateTransfer, CertificateStatus, TransferType
from app.models.claim import CertificateClaim
from app.models.plant import Plant
from app.models.meter import MeterReading
from app.models.investigation import InvestigationCase, CaseStatus, DecisionAction
from app.models.ledger import LedgerBlock, LedgerEventType
from app.engines.ledger_engine import LedgerEngine
from app.schemas.certificate import (
    CertificateResponse,
    CertificateTransferCreate,
    CertificateTransferResponse,
    CertificateProvenanceResponse,
    CertificateLineageResponse,
    EvidenceTimelineItem,
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


@router.get("/lineage/{identifier}", response_model=CertificateLineageResponse)
def get_certificate_lineage(
    identifier: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Search and trace full 6-stage lifecycle lineage for any REC, Claim, or Case.
    Links Ground Truth -> Claim -> AI Risk Assessment -> Investigation -> Certificate -> Transfers -> Ledger.
    """
    identifier_clean = identifier.strip()
    cert = None
    claim = None
    case = None
    search_type = "NOT_FOUND"

    # 1. Try matching Certificate UID
    cert = db.query(Certificate).filter(Certificate.certificate_uid.ilike(identifier_clean)).first()
    if cert:
        search_type = "CERTIFICATE"
        claim = cert.claim
    else:
        # 2. Try matching Claim UID
        claim = db.query(CertificateClaim).filter(CertificateClaim.claim_uid.ilike(identifier_clean)).first()
        if claim:
            search_type = "CLAIM"
            cert = claim.certificate
        else:
            # 3. Try matching Investigation Case number
            case = db.query(InvestigationCase).filter(InvestigationCase.case_number.ilike(identifier_clean)).first()
            if case:
                search_type = "CASE"
                claim = case.claim
                cert = claim.certificate if claim else None

    if not cert and not claim and not case:
        return CertificateLineageResponse(
            found=False,
            query=identifier,
            search_type="NOT_FOUND",
            timeline=[],
        )

    # Fetch investigation case if not already found
    if claim and not case:
        case = db.query(InvestigationCase).filter(InvestigationCase.claim_id == claim.id).first()

    # Plant & Meter
    plant = claim.plant if claim else (cert.plant if cert else None)
    meter = claim.meter_reading if claim and claim.meter_reading_id else None

    # Transfers
    transfers = []
    if cert:
        db_transfers = (
            db.query(CertificateTransfer)
            .filter(CertificateTransfer.certificate_id == cert.id)
            .order_by(CertificateTransfer.timestamp.asc())
            .all()
        )
        for t in db_transfers:
            from_u = db.query(User).filter(User.id == t.from_user_id).first() if t.from_user_id else None
            to_u = db.query(User).filter(User.id == t.to_user_id).first() if t.to_user_id else None
            transfers.append({
                "id": t.id,
                "from_user": from_u.full_name if from_u else "System Issuer",
                "to_user": to_u.full_name if to_u else f"Account #{t.to_user_id}",
                "transfer_type": t.transfer_type.value,
                "timestamp": t.timestamp.isoformat(),
                "tx_hash": t.tx_hash,
            })

    # Ledger Blocks
    entity_ids = []
    if cert:
        entity_ids.append(cert.certificate_uid)
    if claim:
        entity_ids.append(claim.claim_uid)
    if case:
        entity_ids.append(case.case_number)

    ledger_blocks = []
    if entity_ids:
        db_blocks = (
            db.query(LedgerBlock)
            .filter(LedgerBlock.entity_id.in_(entity_ids))
            .order_by(LedgerBlock.index.asc())
            .all()
        )
        for b in db_blocks:
            ledger_blocks.append({
                "index": b.index,
                "event_type": b.event_type.value,
                "entity_type": b.entity_type,
                "entity_id": b.entity_id,
                "current_hash": b.current_hash,
                "previous_hash": b.previous_hash,
                "timestamp": b.timestamp.isoformat(),
            })

    # Build chronological Evidence Timeline
    timeline: List[EvidenceTimelineItem] = []

    # 1. Meter telemetry
    if meter:
        timeline.append(EvidenceTimelineItem(
            timestamp=meter.interval_start.isoformat(),
            stage="GROUND_TRUTH",
            title="Calibrated Meter Reading Recorded",
            description=f"Meter {meter.meter_serial_number} recorded {meter.energy_generated_mwh:,.1f} MWh generated at {plant.name if plant else 'facility'}.",
            severity="INFO",
            actor="Smart Meter IoT",
            icon="gauge",
        ))

    # 2. Claim submission
    if claim:
        timeline.append(EvidenceTimelineItem(
            timestamp=claim.created_at.isoformat(),
            stage="SUBMISSION",
            title=f"Generation Claim Submitted ({claim.claim_uid})",
            description=f"Submitted {claim.claimed_mwh:,.1f} MWh for period {claim.period_start.strftime('%b %d, %Y')} to {claim.period_end.strftime('%b %d, %Y')}. SHA-256 fingerprint: {claim.submission_fingerprint[:16]}...",
            severity="INFO",
            actor="Clean Energy Producer",
            icon="file-text",
        ))

        # 3. AI Forensic Analysis
        risk_breakdown = claim.risk_breakdown or {}
        rec = risk_breakdown.get("recommendation", "HOLD" if claim.risk_score >= 65 else "APPROVE")
        is_fraud = claim.risk_score >= 65
        is_med = 25 <= claim.risk_score < 65
        timeline.append(EvidenceTimelineItem(
            timestamp=claim.updated_at.isoformat(),
            stage="AI_DETECTION",
            title=f"Multi-Engine Forensic Evaluation: {claim.risk_score:.1f}/100",
            description=f"Recommendation: {rec}. {risk_breakdown.get('summary_explanation', 'Evaluation executed.')}",
            severity="CRITICAL" if is_fraud else ("WARNING" if is_med else "SUCCESS"),
            actor="AI Forensic Engine",
            icon="shield-alert" if is_fraud else "shield-check",
        ))

    # 4. Investigation Case (if opened)
    if case:
        timeline.append(EvidenceTimelineItem(
            timestamp=case.created_at.isoformat(),
            stage="INVESTIGATION",
            title=f"Regulatory Investigation Case Opened ({case.case_number})",
            description=f"Priority: {case.priority.value}. Status: {case.status.value}. {case.findings or 'Discrepancies flagged for human adjudication.'}",
            severity="CRITICAL" if case.priority.value in ["CRITICAL", "HIGH"] else "WARNING",
            actor="Regulatory Officer",
            icon="scale",
        ))
        if case.status in [CaseStatus.RESOLVED_FRAUD, CaseStatus.RESOLVED_LEGITIMATE]:
            timeline.append(EvidenceTimelineItem(
                timestamp=case.updated_at.isoformat(),
                stage="ADJUDICATION",
                title=f"Regulatory Decision Finalized: {case.decision_action.value}",
                description=case.findings or "Regulatory adjudication order sealed and signed.",
                severity="CRITICAL" if case.decision_action == DecisionAction.CONFIRM_FRAUD_HOLD else "SUCCESS",
                actor="Judicial Authority",
                icon="gavel",
            ))

    # 5. Certificate Minting (if exists)
    if cert:
        timeline.append(EvidenceTimelineItem(
            timestamp=cert.issuance_date.isoformat(),
            stage="MINTING",
            title=f"Digital REC Token Minted ({cert.certificate_uid})",
            description=f"Volume: {cert.mwh:,.1f} MWh ({cert.fuel_type.value}). Vintage: {cert.vintage_year}-{cert.vintage_month:02d}. Committed to SHA-256 Ledger.",
            severity="SUCCESS",
            actor="REC Registry Issuer",
            icon="award",
        ))

    # 6. Transfers
    for t in transfers:
        timeline.append(EvidenceTimelineItem(
            timestamp=t["timestamp"],
            stage="TRANSFER",
            title=f"REC Transferred: {t['from_user']} → {t['to_user']}",
            description=f"Action: {t['transfer_type']}. Tx Hash: {t['tx_hash'][:16]}...",
            severity="INFO" if t["transfer_type"] != "RETIREMENT" else "SUCCESS",
            actor="Energy Exchange",
            icon="arrow-right-left",
        ))

    # Sort timeline chronologically
    timeline.sort(key=lambda x: x.timestamp)

    # Format responses
    owner = db.query(User).filter(User.id == cert.current_owner_id).first() if cert else None
    submitter = db.query(User).filter(User.id == claim.submitted_by_user_id).first() if claim else None

    return CertificateLineageResponse(
        found=True,
        query=identifier,
        search_type=search_type,
        certificate={
            "id": cert.id,
            "uid": cert.certificate_uid,
            "mwh": cert.mwh,
            "fuel_type": cert.fuel_type.value,
            "vintage": f"{cert.vintage_year}-{cert.vintage_month:02d}",
            "status": cert.status.value,
            "issuance_date": cert.issuance_date.isoformat(),
            "owner_name": owner.organization_name or owner.full_name if owner else "Unknown",
        } if cert else None,
        claim={
            "id": claim.id,
            "uid": claim.claim_uid,
            "mwh": claim.claimed_mwh,
            "period_start": claim.period_start.isoformat(),
            "period_end": claim.period_end.isoformat(),
            "status": claim.status.value,
            "risk_score": claim.risk_score,
            "risk_level": claim.risk_level.value,
            "fingerprint": claim.submission_fingerprint,
            "submitter_name": submitter.organization_name or submitter.full_name if submitter else "Unknown",
        } if claim else None,
        plant={
            "id": plant.id,
            "name": plant.name,
            "fuel_type": plant.fuel_type.value,
            "capacity_mw": plant.nameplate_capacity_mw,
            "grid_id": plant.grid_interconnection_id,
            "max_cf": plant.max_capacity_factor,
            "location": plant.location_address,
        } if plant else None,
        meter={
            "id": meter.id,
            "serial": meter.meter_serial_number,
            "energy_generated_mwh": meter.energy_generated_mwh,
            "interval_start": meter.interval_start.isoformat(),
            "interval_end": meter.interval_end.isoformat(),
        } if meter else None,
        risk_assessment=claim.risk_breakdown if claim else None,
        investigation={
            "id": case.id,
            "case_number": case.case_number,
            "status": case.status.value,
            "priority": case.priority.value,
            "decision_action": case.decision_action.value,
            "findings": case.findings,
        } if case else None,
        transfers=transfers,
        ledger_blocks=ledger_blocks,
        timeline=timeline,
    )
