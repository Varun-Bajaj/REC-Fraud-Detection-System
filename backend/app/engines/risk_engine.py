from datetime import datetime, timezone
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session

from app.config import settings
from app.models.plant import Plant
from app.models.meter import MeterReading
from app.models.claim import RiskLevel
from app.schemas.risk import RiskBreakdown, RiskFactorItem
from app.engines.rule_engine import RuleEngine
from app.engines.ml_engine import ml_anomaly_engine
from app.engines.graph_engine import GraphAnalysisEngine


class RiskFusionEngine:
    """
    Fuses outputs from Rule Engine, ML Anomaly Engine, and Graph Analysis Engine
    into an unified, explainable risk score and actionable recommendation.
    """

    @classmethod
    def evaluate_claim(
        cls,
        db: Session,
        plant: Plant,
        period_start: datetime,
        period_end: datetime,
        claimed_mwh: float,
        submitted_by_user_id: int,
        meter_reading: Optional[MeterReading] = None,
        document_hashes: Optional[List[str]] = None,
        current_claim_id: Optional[int] = None,
    ) -> RiskBreakdown:
        """
        Runs complete forensic pipeline and aggregates scores.
        """
        # 1. Deterministic Rule Engine Scan
        rule_score, rule_factors, has_critical_override = RuleEngine.evaluate(
            db=db,
            plant=plant,
            period_start=period_start,
            period_end=period_end,
            claimed_mwh=claimed_mwh,
            meter_reading=meter_reading,
            document_hashes=document_hashes,
            current_claim_id=current_claim_id,
        )

        # 2. Machine Learning Anomaly Detection (Isolation Forest)
        ml_score, ml_factors = ml_anomaly_engine.evaluate(
            plant=plant,
            period_start=period_start,
            period_end=period_end,
            claimed_mwh=claimed_mwh,
            meter_reading=meter_reading,
        )

        # 3. Graph Analysis Engine Scan (NetworkX)
        graph_score, graph_factors, _ = GraphAnalysisEngine.evaluate_account(
            db=db,
            user_id=submitted_by_user_id,
        )

        # 4. Weighted Fusion
        weighted_score = (
            (settings.WEIGHT_RULES * rule_score) +
            (settings.WEIGHT_ML * ml_score) +
            (settings.WEIGHT_GRAPH * graph_score)
        )

        # 5. Deterministic Critical Override
        # If a critical physical impossibility or exact duplicate is caught, never let weights dilute it
        if has_critical_override:
            final_score = max(weighted_score, 88.0)
        else:
            final_score = weighted_score

        final_score = round(min(100.0, max(0.0, final_score)), 1)

        # 6. Classification & Recommendation
        if final_score < settings.RISK_THRESHOLD_LOW:
            risk_level = RiskLevel.LOW
            recommendation = "APPROVE"
            summary = "Claim conforms to physical plant parameters, smart meter logs, and statistical baselines. Recommended for issuance."
        elif final_score <= settings.RISK_THRESHOLD_HIGH:
            risk_level = RiskLevel.MEDIUM
            recommendation = "NEEDS_REVIEW"
            summary = "Moderate variance detected in generation ratios or unmetered claim. Secondary human verification recommended."
        elif final_score < 85.0:
            risk_level = RiskLevel.HIGH
            recommendation = "HOLD"
            summary = "Significant forensic anomalies detected (meter mismatch, capacity deviation, or abnormal network topology). Hold for audit."
        else:
            risk_level = RiskLevel.CRITICAL
            recommendation = "HOLD"
            summary = "CRITICAL FORENSIC RED FLAG: High probability of fraudulent claim (duplicate submission, impossible generation, or circular wash loop)."

        all_factors: List[RiskFactorItem] = rule_factors + ml_factors + graph_factors

        return RiskBreakdown(
            rule_engine_score=round(rule_score, 1),
            ml_anomaly_score=round(ml_score, 1),
            graph_risk_score=round(graph_score, 1),
            final_risk_score=final_score,
            risk_level=risk_level,
            recommendation=recommendation,
            summary_explanation=summary,
            factors=all_factors,
        )
