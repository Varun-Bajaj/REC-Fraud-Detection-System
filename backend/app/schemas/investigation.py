from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.investigation import CaseStatus, DecisionAction
from app.models.claim import RiskLevel


class InvestigationCaseCreate(BaseModel):
    claim_id: int
    priority: RiskLevel = RiskLevel.HIGH
    notes: Optional[str] = None


class InvestigationCaseUpdate(BaseModel):
    status: Optional[CaseStatus] = None
    assigned_investigator_id: Optional[int] = None
    findings: Optional[str] = None
    notes: Optional[str] = None


class InvestigationCaseDecision(BaseModel):
    decision_action: DecisionAction = Field(..., description="CONFIRM_FRAUD_HOLD or CLEAR_AND_ISSUE")
    findings: str = Field(..., min_length=5)


class InvestigationCaseResponse(BaseModel):
    id: int
    case_number: str
    claim_id: int
    assigned_investigator_id: Optional[int] = None
    status: CaseStatus
    priority: RiskLevel
    findings: Optional[str] = None
    decision_action: DecisionAction
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
