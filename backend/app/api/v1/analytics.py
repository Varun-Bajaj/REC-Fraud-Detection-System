from typing import Dict, List
import networkx as nx
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.plant import Plant
from app.models.claim import CertificateClaim, ClaimStatus, RiskLevel
from app.models.certificate import Certificate, CertificateTransfer, CertificateStatus, TransferType
from app.models.investigation import InvestigationCase, CaseStatus
from app.engines.graph_engine import GraphAnalysisEngine
from app.schemas.analytics import (
    DashboardStatsResponse,
    NetworkGraphResponse,
    NetworkGraphNode,
    NetworkGraphEdge,
)

router = APIRouter(prefix="/analytics", tags=["Analytics & Dashboards"])


@router.get("/dashboard", response_model=DashboardStatsResponse)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve system-wide fraud intelligence metrics and volume KPIs."""
    total_plants = db.query(Plant).count()

    claims = db.query(CertificateClaim).all()
    total_claims = len(claims)
    total_mwh_claimed = sum(c.claimed_mwh for c in claims)

    claims_pending = sum(1 for c in claims if c.status == ClaimStatus.PENDING)
    claims_approved = sum(1 for c in claims if c.status == ClaimStatus.APPROVED)
    claims_under_review = sum(1 for c in claims if c.status == ClaimStatus.UNDER_REVIEW)
    claims_held = sum(1 for c in claims if c.status == ClaimStatus.HELD)

    risk_dist = {
        "LOW": sum(1 for c in claims if c.risk_level == RiskLevel.LOW),
        "MEDIUM": sum(1 for c in claims if c.risk_level == RiskLevel.MEDIUM),
        "HIGH": sum(1 for c in claims if c.risk_level == RiskLevel.HIGH),
        "CRITICAL": sum(1 for c in claims if c.risk_level == RiskLevel.CRITICAL),
    }

    certs = db.query(Certificate).all()
    total_certificates_issued = len(certs)
    total_mwh_issued = sum(c.mwh for c in certs)
    total_certificates_redeemed = sum(1 for c in certs if c.status == CertificateStatus.REDEEMED)

    transfers = db.query(CertificateTransfer).filter(CertificateTransfer.transfer_type == TransferType.TRANSFER).all()
    total_transfers = len(transfers)

    open_cases = (
        db.query(InvestigationCase)
        .filter(InvestigationCase.status.in_([CaseStatus.OPEN, CaseStatus.UNDER_INVESTIGATION]))
        .count()
    )

    return DashboardStatsResponse(
        total_plants=total_plants,
        total_mwh_claimed=round(total_mwh_claimed, 2),
        total_mwh_issued=round(total_mwh_issued, 2),
        total_claims=total_claims,
        claims_pending=claims_pending,
        claims_approved=claims_approved,
        claims_under_review=claims_under_review,
        claims_held=claims_held,
        total_certificates_issued=total_certificates_issued,
        total_certificates_transferred=total_transfers,
        total_certificates_redeemed=total_certificates_redeemed,
        open_investigation_cases=open_cases,
        risk_distribution=risk_dist,
    )


@router.get("/network-graph", response_model=NetworkGraphResponse)
def get_transfer_network_graph(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve full entity graph with nodes, edges, and detected circular wash rings."""
    G = GraphAnalysisEngine.build_transfer_graph(db)

    # Detect cycles
    raw_cycles = list(nx.simple_cycles(G))
    cycle_edges = set()
    for cycle in raw_cycles:
        for i in range(len(cycle)):
            src = cycle[i]
            dst = cycle[(i + 1) % len(cycle)]
            cycle_edges.add((src, dst))

    nodes: List[NetworkGraphNode] = []
    users = db.query(User).all()
    for u in users:
        nodes.append(
            NetworkGraphNode(
                id=str(u.id),
                label=u.full_name,
                role=u.role.value,
                organization=u.organization_name,
            )
        )

    edges: List[NetworkGraphEdge] = []
    transfers = (
        db.query(CertificateTransfer)
        .filter(CertificateTransfer.from_user_id.isnot(None))
        .all()
    )
    for tx in transfers:
        src = str(tx.from_user_id)
        dst = str(tx.to_user_id)
        is_cycle = (src, dst) in cycle_edges

        edges.append(
            NetworkGraphEdge(
                id=f"tx-{tx.id}",
                source=src,
                target=dst,
                certificate_uid=tx.certificate.certificate_uid if tx.certificate else f"CERT-{tx.certificate_id}",
                mwh=tx.certificate.mwh if tx.certificate else 0.0,
                timestamp=tx.timestamp.isoformat(),
                is_suspicious_cycle=is_cycle,
            )
        )

    # Calculate average clustering coefficient
    try:
        clustering = float(nx.average_clustering(G.to_undirected()))
    except Exception:
        clustering = 0.0

    return NetworkGraphResponse(
        nodes=nodes,
        edges=edges,
        detected_cycles=raw_cycles,
        clustering_coefficient=round(clustering, 3),
    )
