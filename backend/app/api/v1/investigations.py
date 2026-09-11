import hashlib
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.user import User, UserRole
from app.models.claim import CertificateClaim, ClaimStatus, RiskLevel
from app.models.certificate import Certificate, CertificateTransfer, CertificateStatus, TransferType
from app.models.investigation import InvestigationCase, CaseStatus, DecisionAction
from app.models.ledger import LedgerEventType
from app.engines.ledger_engine import LedgerEngine
from app.schemas.investigation import (
    InvestigationCaseCreate,
    InvestigationCaseUpdate,
    InvestigationCaseDecision,
    InvestigationCaseResponse,
)

router = APIRouter(prefix="/investigations", tags=["Investigations & Forensic Cases"])


@router.get("/", response_model=List[InvestigationCaseResponse])
def list_investigation_cases(
    status_filter: Optional[CaseStatus] = None,
    priority_filter: Optional[RiskLevel] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.REGULATOR, UserRole.AUDITOR, UserRole.ADMIN])),
):
    """List forensic investigation cases for regulators and auditors."""
    query = db.query(InvestigationCase)
    if status_filter:
        query = query.filter(InvestigationCase.status == status_filter)
    if priority_filter:
        query = query.filter(InvestigationCase.priority == priority_filter)

    return query.order_by(InvestigationCase.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{case_id}", response_model=InvestigationCaseResponse)
def get_investigation_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.REGULATOR, UserRole.AUDITOR, UserRole.ADMIN])),
):
    """Retrieve details for a specific investigation case."""
    case = db.query(InvestigationCase).filter(InvestigationCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigation case not found.")
    return case


@router.patch("/{case_id}", response_model=InvestigationCaseResponse)
def update_investigation_case(
    case_id: int,
    update_in: InvestigationCaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.REGULATOR, UserRole.AUDITOR, UserRole.ADMIN])),
):
    """Update case assignment, status, or forensic findings."""
    case = db.query(InvestigationCase).filter(InvestigationCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigation case not found.")

    if update_in.status is not None:
        case.status = update_in.status
    if update_in.assigned_investigator_id is not None:
        case.assigned_investigator_id = update_in.assigned_investigator_id
    if update_in.findings is not None:
        case.findings = update_in.findings
    if update_in.notes is not None:
        case.notes = update_in.notes

    db.commit()
    db.refresh(case)
    return case


@router.post("/{case_id}/decision", response_model=InvestigationCaseResponse)
def make_regulator_decision(
    case_id: int,
    decision_in: InvestigationCaseDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.REGULATOR, UserRole.ADMIN])),
):
    """
    Human-in-the-loop final regulatory adjudication.
    - CONFIRM_FRAUD_HOLD: rejects claim permanently.
    - CLEAR_AND_ISSUE: overrides risk flag, approves claim, and mints certificate onto ledger.
    """
    case = db.query(InvestigationCase).filter(InvestigationCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigation case not found.")

    claim = case.claim
    case.decision_action = decision_in.decision_action
    case.findings = decision_in.findings

    now = datetime.now(timezone.utc)

    if decision_in.decision_action == DecisionAction.CONFIRM_FRAUD_HOLD:
        case.status = CaseStatus.RESOLVED_FRAUD
        claim.status = ClaimStatus.REJECTED

        # Record resolution on ledger
        LedgerEngine.record_event(
            db=db,
            event_type=LedgerEventType.INVESTIGATION_RESOLVED,
            entity_type="INVESTIGATION",
            entity_id=case.case_number,
            data_payload={
                "case_number": case.case_number,
                "claim_uid": claim.claim_uid,
                "regulator_id": current_user.id,
                "action": "CONFIRM_FRAUD_HOLD",
                "findings": decision_in.findings,
            },
        )

    elif decision_in.decision_action == DecisionAction.CLEAR_AND_ISSUE:
        case.status = CaseStatus.RESOLVED_LEGITIMATE
        claim.status = ClaimStatus.APPROVED

        # Mint certificate
        cert_uid = f"REC-{now.year}-{claim.plant.fuel_type.value[:3]}-{uuid.uuid4().hex[:8].upper()}"
        cert = Certificate(
            certificate_uid=cert_uid,
            claim_id=claim.id,
            plant_id=claim.plant_id,
            current_owner_id=claim.plant.owner_id,
            fuel_type=claim.plant.fuel_type,
            mwh=claim.claimed_mwh,
            vintage_year=claim.period_start.year,
            vintage_month=claim.period_start.month,
            status=CertificateStatus.ISSUED,
        )
        db.add(cert)
        db.flush()

        tx_hash = hashlib.sha256(f"{cert_uid}_ISSUED_POST_AUDIT_{now.isoformat()}".encode()).hexdigest()
        tx = CertificateTransfer(
            certificate_id=cert.id,
            from_user_id=None,
            to_user_id=claim.plant.owner_id,
            transfer_type=TransferType.ISSUANCE,
            tx_hash=tx_hash,
        )
        db.add(tx)

        # Record on ledger
        LedgerEngine.record_event(
            db=db,
            event_type=LedgerEventType.INVESTIGATION_RESOLVED,
            entity_type="INVESTIGATION",
            entity_id=case.case_number,
            data_payload={
                "case_number": case.case_number,
                "claim_uid": claim.claim_uid,
                "regulator_id": current_user.id,
                "action": "CLEAR_AND_ISSUE",
                "issued_certificate_uid": cert_uid,
                "findings": decision_in.findings,
            },
        )

    db.commit()
    db.refresh(case)
    return case
