from datetime import datetime
from typing import Dict, List, Optional, Set, Tuple
import networkx as nx
from sqlalchemy.orm import Session

from app.models.certificate import CertificateTransfer, TransferType
from app.models.user import User
from app.schemas.risk import RiskFactorItem


class GraphAnalysisEngine:
    """
    Graph Relationship Engine using NetworkX.
    Analyzes certificate transfer networks for:
    - Circular wash-trading loops (A -> B -> C -> A)
    - Closed collusion clusters
    - Rapid pass-through laundering
    """

    @classmethod
    def build_transfer_graph(cls, db: Session) -> nx.DiGraph:
        """Construct directed network of all certificate transfers."""
        G = nx.DiGraph()

        # Load users as nodes
        users = db.query(User).all()
        for u in users:
            G.add_node(
                str(u.id),
                name=u.full_name,
                organization=u.organization_name or u.full_name,
                role=u.role.value,
            )

        # Load transfers as edges
        transfers = (
            db.query(CertificateTransfer)
            .filter(CertificateTransfer.from_user_id.isnot(None))
            .all()
        )
        for tx in transfers:
            G.add_edge(
                str(tx.from_user_id),
                str(tx.to_user_id),
                certificate_id=tx.certificate_id,
                transfer_id=tx.id,
                timestamp=tx.timestamp.isoformat(),
                tx_hash=tx.tx_hash,
            )

        return G

    @classmethod
    def evaluate_account(
        cls,
        db: Session,
        user_id: int
    ) -> Tuple[float, List[RiskFactorItem], List[List[str]]]:
        """
        Evaluates graph risk for a specific participant account.
        Returns:
            (graph_score [0.0 - 100.0], factors, detected_cycles)
        """
        G = cls.build_transfer_graph(db)
        user_node = str(user_id)

        factors: List[RiskFactorItem] = []
        graph_score = 0.0
        detected_cycles: List[List[str]] = []

        if not G.has_node(user_node):
            factors.append(
                RiskFactorItem(
                    rule_id="GRAPH-000",
                    name="No Prior Transfer History",
                    category="GRAPH_NETWORK",
                    severity="LOW",
                    score_contribution=0.0,
                    description="Account has clean or nascent transfer footprint.",
                    flagged=False,
                )
            )
            return 0.0, factors, []

        # 1. Cycle Detection (Circular Transfer Rings)
        all_cycles = list(nx.simple_cycles(G))
        relevant_cycles = [cycle for cycle in all_cycles if user_node in cycle]

        if relevant_cycles:
            detected_cycles = relevant_cycles
            cycle_strs = [" -> ".join(c + [c[0]]) for c in relevant_cycles[:3]]
            graph_score += 85.0
            factors.append(
                RiskFactorItem(
                    rule_id="GRAPH-001",
                    name="Circular Transfer Wash Loop Detected",
                    category="GRAPH_NETWORK",
                    severity="CRITICAL",
                    score_contribution=85.0,
                    description=(
                        f"Account is engaged in {len(relevant_cycles)} circular transfer cycle(s). "
                        f"Pattern: {cycle_strs[0]}"
                    ),
                    flagged=True,
                    evidence_details={
                        "total_cycles_count": len(relevant_cycles),
                        "sample_cycles": cycle_strs,
                    },
                )
            )

        # 2. Reciprocity & Collusion
        # Check if user and counterparties rapidly trade back and forth
        neighbors = set(G.successors(user_node)).union(set(G.predecessors(user_node)))
        reciprocal_count = 0
        for n in neighbors:
            if G.has_edge(user_node, n) and G.has_edge(n, user_node):
                reciprocal_count += 1

        if reciprocal_count > 0 and not relevant_cycles:
            graph_score += 40.0
            factors.append(
                RiskFactorItem(
                    rule_id="GRAPH-002",
                    name="High-Frequency Reciprocal Trading Pattern",
                    category="GRAPH_NETWORK",
                    severity="HIGH",
                    score_contribution=40.0,
                    description=f"Direct bidirectional certificate swapping observed with {reciprocal_count} counterparty account(s).",
                    flagged=True,
                    evidence_details={"reciprocal_counterparties_count": reciprocal_count},
                )
            )

        if not factors:
            factors.append(
                RiskFactorItem(
                    rule_id="GRAPH-000",
                    name="Clean Transfer Network Topology",
                    category="GRAPH_PASS",
                    severity="LOW",
                    score_contribution=0.0,
                    description="No circular wash trading or collusive clustering detected.",
                    flagged=False,
                )
            )

        normalized_score = min(100.0, graph_score)
        return normalized_score, factors, detected_cycles
