from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from app.models.claim import RiskLevel


class RiskFactorItem(BaseModel):
    rule_id: str
    name: str
    category: str  # "METER_CHECK", "CAPACITY_CHECK", "DUPLICATE_CHECK", "DOCUMENT_CHECK", "ML_ANOMALY", "GRAPH_NETWORK"
    severity: str  # "LOW", "MEDIUM", "HIGH", "CRITICAL"
    score_contribution: float
    description: str
    flagged: bool
    evidence_details: Optional[Dict[str, Any]] = None


class RiskBreakdown(BaseModel):
    rule_engine_score: float
    ml_anomaly_score: float
    graph_risk_score: float
    final_risk_score: float
    risk_level: RiskLevel
    recommendation: str  # "APPROVE", "NEEDS_REVIEW", "HOLD"
    summary_explanation: str
    factors: List[RiskFactorItem]


class RiskEvaluationResponse(BaseModel):
    claim_id: int
    claim_uid: str
    plant_id: int
    evaluated_at: datetime
    breakdown: RiskBreakdown
