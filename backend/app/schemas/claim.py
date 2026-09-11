from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.claim import ClaimStatus, RiskLevel, DocumentType
from app.schemas.risk import RiskBreakdown


class DocumentEvidenceCreate(BaseModel):
    document_type: DocumentType = DocumentType.METER_REPORT
    file_name: str
    file_hash: str = Field(..., min_length=64, max_length=64)  # SHA-256
    file_size_bytes: int


class DocumentEvidenceResponse(BaseModel):
    id: int
    claim_id: int
    document_type: DocumentType
    file_name: str
    file_hash: str
    file_size_bytes: int
    storage_path: Optional[str] = None
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ClaimCreate(BaseModel):
    plant_id: int
    period_start: datetime
    period_end: datetime
    claimed_mwh: float = Field(..., gt=0.0)
    meter_reading_id: Optional[int] = None
    document_hashes: Optional[List[DocumentEvidenceCreate]] = []


class ClaimResponse(BaseModel):
    id: int
    claim_uid: str
    plant_id: int
    submitted_by_user_id: int
    period_start: datetime
    period_end: datetime
    claimed_mwh: float
    meter_reading_id: Optional[int] = None
    submission_fingerprint: str
    status: ClaimStatus
    risk_score: float
    risk_level: RiskLevel
    risk_breakdown: Optional[dict] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ClaimDetailResponse(ClaimResponse):
    documents: List[DocumentEvidenceResponse] = []
