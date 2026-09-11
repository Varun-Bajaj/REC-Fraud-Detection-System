import hashlib
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.user import User, UserRole
from app.models.plant import Plant
from app.models.meter import MeterReading
from app.models.claim import CertificateClaim, DocumentEvidence, ClaimStatus, RiskLevel, DocumentType
from app.models.certificate import Certificate, CertificateTransfer, CertificateStatus, TransferType
from app.models.investigation import InvestigationCase, CaseStatus, DecisionAction
from app.models.ledger import LedgerEventType
from app.engines.rule_engine import compute_submission_fingerprint
from app.engines.risk_engine import RiskFusionEngine
from app.engines.ledger_engine import LedgerEngine
from app.schemas.claim import ClaimCreate, ClaimResponse, ClaimDetailResponse, DocumentEvidenceResponse
from app.schemas.risk import RiskEvaluationResponse

router = APIRouter(prefix="/claims", tags=["Claims"])


def generate_claim_uid() -> str:
    """Generate unique claim identifier."""
    year = datetime.now(timezone.utc).year
    random_part = uuid.uuid4().hex[:6].upper()
    return f"CLM-{year}-{random_part}"


def generate_cert_uid(fuel_type: str) -> str:
    """Generate globally unique standard REC identifier."""
    year = datetime.now(timezone.utc).year
    random_part = uuid.uuid4().hex[:8].upper()
    return f"REC-{year}-{fuel_type[:3]}-{random_part}"


@router.post("/", response_model=ClaimResponse, status_code=status.HTTP_201_CREATED)
def submit_generation_claim(
    claim_in: ClaimCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.GENERATOR, UserRole.ADMIN])),
):
    """
    Submit a renewable energy generation claim.
    Executes real-time multi-layer forensic detection:
    - Rule Engine (Physics, Meter, Duplicate, Evidence Hash)
    - ML Anomaly Engine (Isolation Forest)
    - Graph Network Analysis (Transfer Loops)
    - Tamper-Evident Ledger Recording
    """
    plant = db.query(Plant).filter(Plant.id == claim_in.plant_id).first()
    if not plant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plant not found.")

    if current_user.role == UserRole.GENERATOR and plant.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only submit generation claims for plants you own.",
        )

    # Meter reading lookup
    meter_reading = None
    if claim_in.meter_reading_id:
        meter_reading = db.query(MeterReading).filter(MeterReading.id == claim_in.meter_reading_id).first()
        if not meter_reading:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Specified meter reading does not exist.")

    # Extract doc hashes
    doc_hashes = [d.file_hash for d in (claim_in.document_hashes or [])]

    # Compute submission fingerprint
    fingerprint = compute_submission_fingerprint(
        plant_id=plant.id,
        start=claim_in.period_start,
        end=claim_in.period_end,
        mwh=claim_in.claimed_mwh,
    )

    # Evaluate forensic risk
    risk_breakdown = RiskFusionEngine.evaluate_claim(
        db=db,
        plant=plant,
        period_start=claim_in.period_start,
        period_end=claim_in.period_end,
        claimed_mwh=claim_in.claimed_mwh,
        submitted_by_user_id=current_user.id,
        meter_reading=meter_reading,
        document_hashes=doc_hashes,
    )

    # Determine initial lifecycle status based on risk recommendation
    if risk_breakdown.recommendation == "APPROVE":
        initial_status = ClaimStatus.APPROVED
    elif risk_breakdown.recommendation == "NEEDS_REVIEW":
        initial_status = ClaimStatus.UNDER_REVIEW
    else:
        initial_status = ClaimStatus.HELD

    claim_uid = generate_claim_uid()

    claim = CertificateClaim(
        claim_uid=claim_uid,
        plant_id=plant.id,
        submitted_by_user_id=current_user.id,
        period_start=claim_in.period_start,
        period_end=claim_in.period_end,
        claimed_mwh=claim_in.claimed_mwh,
        meter_reading_id=claim_in.meter_reading_id,
        submission_fingerprint=fingerprint,
        status=initial_status,
        risk_score=risk_breakdown.final_risk_score,
        risk_level=risk_breakdown.risk_level,
        risk_breakdown=risk_breakdown.model_dump(),
    )
    db.add(claim)
    db.flush()  # get claim.id

    # Add document evidence
    for doc in (claim_in.document_hashes or []):
        doc_evidence = DocumentEvidence(
            claim_id=claim.id,
            document_type=doc.document_type,
            file_name=doc.file_name,
            file_hash=doc.file_hash,
            file_size_bytes=doc.file_size_bytes,
        )
        db.add(doc_evidence)

    # Ledger event: CLAIM_SUBMITTED
    LedgerEngine.record_event(
        db=db,
        event_type=LedgerEventType.CLAIM_SUBMITTED,
        entity_type="CLAIM",
        entity_id=claim_uid,
        data_payload={
            "claim_uid": claim_uid,
            "plant_id": plant.id,
            "plant_name": plant.name,
            "claimed_mwh": claim.claimed_mwh,
            "period_start": claim.period_start.isoformat(),
            "period_end": claim.period_end.isoformat(),
            "submission_fingerprint": fingerprint,
            "risk_score": claim.risk_score,
            "risk_level": claim.risk_level.value,
        },
    )

    # If APPROVED immediately, issue certificate
    if initial_status == ClaimStatus.APPROVED:
        cert_uid = generate_cert_uid(plant.fuel_type.value)
        certificate = Certificate(
            certificate_uid=cert_uid,
            claim_id=claim.id,
            plant_id=plant.id,
            current_owner_id=plant.owner_id,
            fuel_type=plant.fuel_type,
            mwh=claim.claimed_mwh,
            vintage_year=claim.period_start.year,
            vintage_month=claim.period_start.month,
            status=CertificateStatus.ISSUED,
        )
        db.add(certificate)
        db.flush()

        # Issuance transfer record
        tx_hash = hashlib.sha256(f"{cert_uid}_ISSUED_{datetime.now(timezone.utc).isoformat()}".encode()).hexdigest()
        tx = CertificateTransfer(
            certificate_id=certificate.id,
            from_user_id=None,
            to_user_id=plant.owner_id,
            transfer_type=TransferType.ISSUANCE,
            tx_hash=tx_hash,
        )
        db.add(tx)

        # Record CERTIFICATE_ISSUED in ledger
        LedgerEngine.record_event(
            db=db,
            event_type=LedgerEventType.CERTIFICATE_ISSUED,
            entity_type="CERTIFICATE",
            entity_id=cert_uid,
            data_payload={
                "certificate_uid": cert_uid,
                "claim_uid": claim_uid,
                "plant_id": plant.id,
                "owner_id": plant.owner_id,
                "mwh": claim.claimed_mwh,
                "tx_hash": tx_hash,
            },
        )

    # If HELD / High Risk, automatically open an Investigation Case
    elif initial_status == ClaimStatus.HELD:
        case_number = f"CASE-{datetime.now(timezone.utc).year}-{uuid.uuid4().hex[:6].upper()}"
        investigation = InvestigationCase(
            case_number=case_number,
            claim_id=claim.id,
            status=CaseStatus.OPEN,
            priority=claim.risk_level,
            decision_action=DecisionAction.CONFIRM_FRAUD_HOLD,
            findings=f"Automated forensic trigger: {risk_breakdown.summary_explanation}",
            notes=f"Flagged rules count: {len([f for f in risk_breakdown.factors if f.flagged])}",
        )
        db.add(investigation)

        # Record INVESTIGATION_OPENED in ledger
        LedgerEngine.record_event(
            db=db,
            event_type=LedgerEventType.INVESTIGATION_OPENED,
            entity_type="INVESTIGATION",
            entity_id=case_number,
            data_payload={
                "case_number": case_number,
                "claim_uid": claim_uid,
                "risk_score": claim.risk_score,
                "risk_level": claim.risk_level.value,
                "summary": risk_breakdown.summary_explanation,
            },
        )

    db.commit()
    db.refresh(claim)
    return claim


@router.get("/", response_model=List[ClaimResponse])
def list_claims(
    plant_id: Optional[int] = None,
    status_filter: Optional[ClaimStatus] = None,
    risk_level: Optional[RiskLevel] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List generation claims with status & risk filters."""
    query = db.query(CertificateClaim)
    if plant_id:
        query = query.filter(CertificateClaim.plant_id == plant_id)
    if status_filter:
        query = query.filter(CertificateClaim.status == status_filter)
    if risk_level:
        query = query.filter(CertificateClaim.risk_level == risk_level)
    if current_user.role == UserRole.GENERATOR:
        query = query.filter(CertificateClaim.submitted_by_user_id == current_user.id)

    return query.order_by(CertificateClaim.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{claim_id}", response_model=ClaimDetailResponse)
def get_claim(
    claim_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve full details, documents, and explainable risk breakdown for a claim."""
    claim = db.query(CertificateClaim).filter(CertificateClaim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found.")
    return claim


@router.post("/{claim_id}/evaluate", response_model=RiskEvaluationResponse)
def evaluate_claim_risk(
    claim_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.REGULATOR, UserRole.AUDITOR, UserRole.ADMIN])),
):
    """Re-run forensic engines (Rule + ML + Graph) and update claim risk score."""
    claim = db.query(CertificateClaim).filter(CertificateClaim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found.")

    plant = claim.plant
    meter_reading = claim.meter_reading
    doc_hashes = [d.file_hash for d in claim.documents]

    risk_breakdown = RiskFusionEngine.evaluate_claim(
        db=db,
        plant=plant,
        period_start=claim.period_start,
        period_end=claim.period_end,
        claimed_mwh=claim.claimed_mwh,
        submitted_by_user_id=claim.submitted_by_user_id,
        meter_reading=meter_reading,
        document_hashes=doc_hashes,
        current_claim_id=claim.id,
    )

    claim.risk_score = risk_breakdown.final_risk_score
    claim.risk_level = risk_breakdown.risk_level
    claim.risk_breakdown = risk_breakdown.model_dump()
    db.commit()
    db.refresh(claim)

    return RiskEvaluationResponse(
        claim_id=claim.id,
        claim_uid=claim.claim_uid,
        plant_id=plant.id,
        evaluated_at=datetime.now(timezone.utc),
        breakdown=risk_breakdown,
    )


@router.post("/{claim_id}/documents", response_model=DocumentEvidenceResponse)
async def upload_supporting_document(
    claim_id: int,
    document_type: DocumentType = Form(DocumentType.METER_REPORT),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload and attach a supporting document evidence file with automated SHA-256 fingerprinting."""
    claim = db.query(CertificateClaim).filter(CertificateClaim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found.")

    content = await file.read()
    file_hash = hashlib.sha256(content).hexdigest()

    doc_evidence = DocumentEvidence(
        claim_id=claim.id,
        document_type=document_type,
        file_name=file.filename or "evidence.pdf",
        file_hash=file_hash,
        file_size_bytes=len(content),
    )
    db.add(doc_evidence)
    db.commit()
    db.refresh(doc_evidence)
    return doc_evidence
