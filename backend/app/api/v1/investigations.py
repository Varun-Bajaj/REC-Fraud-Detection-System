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


@router.post("/{case_id}/ai-investigate")
async def run_langgraph_investigation(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.REGULATOR, UserRole.AUDITOR, UserRole.ADMIN])),
):
    """
    Triggers an autonomous LangGraph multi-agent forensic investigation on a case.
    Uses pure-Python registry & satellite weather tools (Device Guard compliant).
    """
    case = db.query(InvestigationCase).filter(InvestigationCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigation case not found.")

    claim = case.claim
    meter_reading = getattr(claim, 'meter_reading', None)
    meter_mwh = meter_reading.energy_generated_mwh if meter_reading else 0.0

    from app.agents.forensic_graph import forensic_investigation_graph

    initial_state = {
        "claim_id": claim.id,
        "claim_uid": claim.claim_uid,
        "plant_name": claim.plant.name if claim.plant else "Unknown Facility",
        "claimed_mwh": float(claim.claimed_mwh),
        "meter_mwh": float(meter_mwh),
        "latitude": float(claim.plant.latitude) if claim.plant and claim.plant.latitude else 35.0,
        "longitude": float(claim.plant.longitude) if claim.plant and claim.plant.longitude else -115.0,
        "registry_data": {},
        "weather_data": {},
        "violations": [],
        "risk_score": 0.0,
        "verdict": "",
        "reasoning": "",
    }

    result = await forensic_investigation_graph.ainvoke(initial_state)

    # Save agent findings back to case notes
    case.findings = result.get("reasoning", "")
    db.commit()
    db.refresh(case)

    return {
        "case_id": case.id,
        "case_number": case.case_number,
        "agent_verdict": result.get("verdict"),
        "agent_risk_score": result.get("risk_score"),
        "violations": result.get("violations", []),
        "agent_reasoning": result.get("reasoning"),
        "registry_evidence": result.get("registry_data"),
        "weather_evidence": result.get("weather_data"),
    }


@router.post("/{case_id}/ai-investigate-offline")
async def run_offline_groq_investigation(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.REGULATOR, UserRole.AUDITOR, UserRole.ADMIN])),
):
    """
    Triggers Groq LPU + LangGraph forensic analysis for offline or paper-issued certificates.
    Scrutinizes document text, catches duplicate serials, and performs satellite thermodynamic validation.
    """
    case = db.query(InvestigationCase).filter(InvestigationCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigation case not found.")

    claim = case.claim
    plant = claim.plant

    doc_text = ""
    file_sha256 = claim.submission_fingerprint
    if claim.documents:
        doc_text = f"Attached Document: {claim.documents[0].file_name} (Hash: {claim.documents[0].file_hash})"
    else:
        doc_text = f"Manual offline claim submitted by user {claim.submitted_by_user_id} for {claim.claimed_mwh} MWh."

    from app.agents.offline_certificate_graph import offline_certificate_graph

    state_input = {
        "certificate_id": f"OFFLINE-CLAIM-{claim.claim_uid}",
        "raw_document_text": doc_text,
        "file_sha256": file_sha256,
        "plant_name": plant.name if plant else "Unknown Facility",
        "fuel_type": plant.fuel_type.value if plant else "SOLAR",
        "capacity_mw": float(plant.capacity_mw) if plant else 50.0,
        "claimed_mwh": float(claim.claimed_mwh),
        "vintage_start": claim.period_start.strftime("%Y-%m-%d"),
        "vintage_end": claim.period_end.strftime("%Y-%m-%d"),
        "latitude": float(plant.latitude) if plant and plant.latitude else 35.0,
        "longitude": float(plant.longitude) if plant and plant.longitude else -115.0,
        "extracted_metadata": {},
        "document_anomalies": [],
        "duplicate_check": {},
        "satellite_weather": {},
        "statutory_violations": [],
        "fraud_risk_score": 0.0,
        "verdict": "",
        "executive_summary": "",
        "groq_engine_used": False,
    }

    result = await offline_certificate_graph.ainvoke(state_input)

    case.findings = f"Groq Offline Audit:\n{result.get('executive_summary', '')}"
    db.commit()
    db.refresh(case)

    return {
        "case_id": case.id,
        "case_number": case.case_number,
        "verdict": result.get("verdict"),
        "fraud_risk_score": result.get("fraud_risk_score"),
        "groq_engine_used": result.get("groq_engine_used"),
        "executive_summary": result.get("executive_summary"),
        "document_anomalies": result.get("document_anomalies", []),
        "statutory_violations": result.get("statutory_violations", []),
        "duplicate_check": result.get("duplicate_check", {}),
        "satellite_weather": result.get("satellite_weather", {}),
    }


