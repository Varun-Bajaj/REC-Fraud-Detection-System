from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class DashboardStatsResponse(BaseModel):
    total_plants: int
    total_mwh_claimed: float
    total_mwh_issued: float
    total_claims: int
    claims_pending: int
    claims_approved: int
    claims_under_review: int
    claims_held: int
    total_certificates_issued: int
    total_certificates_transferred: int
    total_certificates_redeemed: int
    open_investigation_cases: int
    risk_distribution: Dict[str, int]  # {"LOW": 10, "MEDIUM": 3, "HIGH": 2, "CRITICAL": 1}


class NetworkGraphNode(BaseModel):
    id: str
    label: str
    role: str
    organization: Optional[str] = None


class NetworkGraphEdge(BaseModel):
    id: str
    source: str
    target: str
    certificate_uid: str
    mwh: float
    timestamp: str
    is_suspicious_cycle: bool = False


class NetworkGraphResponse(BaseModel):
    nodes: List[NetworkGraphNode]
    edges: List[NetworkGraphEdge]
    detected_cycles: List[List[str]]
    clustering_coefficient: float
