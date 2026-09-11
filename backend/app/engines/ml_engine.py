from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
import numpy as np
from sklearn.ensemble import IsolationForest

from app.models.plant import Plant, FuelType
from app.models.meter import MeterReading
from app.schemas.risk import RiskFactorItem


class MLAnomalyEngine:
    """
    Machine Learning Anomaly Detection Engine using Scikit-Learn Isolation Forest.
    Analyzes multi-dimensional feature space (capacity utilization, meter deviation,
    hourly generation density) against plant baselines to detect statistical outliers.
    """

    # Baseline nominal operational profiles per fuel type: (mean_cf, std_cf, mean_mwh_per_mw)
    PROFILES = {
        FuelType.SOLAR: {"mean_cf": 0.22, "std_cf": 0.05, "max_normal_cf": 0.35},
        FuelType.WIND: {"mean_cf": 0.38, "std_cf": 0.09, "max_normal_cf": 0.55},
        FuelType.HYDRO: {"mean_cf": 0.55, "std_cf": 0.12, "max_normal_cf": 0.80},
        FuelType.BIOMASS: {"mean_cf": 0.65, "std_cf": 0.10, "max_normal_cf": 0.85},
        FuelType.GEOTHERMAL: {"mean_cf": 0.85, "std_cf": 0.05, "max_normal_cf": 0.95},
    }

    def __init__(self):
        # Pre-train baseline models for rapid zero-cold-start scoring
        self.models: Dict[FuelType, IsolationForest] = {}
        self._initialize_baseline_models()

    def _initialize_baseline_models(self):
        """Train baseline Isolation Forest models for each fuel type with standard distributions."""
        np.random.seed(42)
        for fuel_type, profile in self.PROFILES.items():
            # Generate 500 normal samples for this fuel profile
            cf = np.random.normal(profile["mean_cf"], profile["std_cf"], 500)
            cf = np.clip(cf, 0.01, profile["max_normal_cf"])
            meter_ratio = np.random.normal(1.0, 0.015, 500)  # normally ~1.0 with 1.5% variance
            density = cf * 1.0  # normalized MWh/MW-h

            X = np.column_stack([cf, meter_ratio, density])
            clf = IsolationForest(
                n_estimators=100,
                contamination=0.03,
                random_state=42
            )
            clf.fit(X)
            self.models[fuel_type] = clf

    def extract_features(
        self,
        plant: Plant,
        period_start: datetime,
        period_end: datetime,
        claimed_mwh: float,
        meter_reading: Optional[MeterReading] = None,
    ) -> np.ndarray:
        """Extract normalized feature vector for inference."""
        start_utc = period_start.replace(tzinfo=timezone.utc) if period_start.tzinfo is None else period_start
        end_utc = period_end.replace(tzinfo=timezone.utc) if period_end.tzinfo is None else period_end
        duration_hours = max((end_utc - start_utc).total_seconds() / 3600.0, 1.0)

        # Feature 1: Capacity factor
        total_possible = plant.nameplate_capacity_mw * duration_hours
        capacity_factor = claimed_mwh / total_possible if total_possible > 0 else 0.0

        # Feature 2: Meter ratio (claimed / metered)
        if meter_reading and meter_reading.energy_generated_mwh > 0:
            meter_ratio = claimed_mwh / meter_reading.energy_generated_mwh
        else:
            meter_ratio = 1.0

        # Feature 3: Generation density per MW
        density = claimed_mwh / (plant.nameplate_capacity_mw * duration_hours)

        return np.array([[capacity_factor, meter_ratio, density]])

    def evaluate(
        self,
        plant: Plant,
        period_start: datetime,
        period_end: datetime,
        claimed_mwh: float,
        meter_reading: Optional[MeterReading] = None,
    ) -> Tuple[float, List[RiskFactorItem]]:
        """
        Runs Isolation Forest anomaly detection.
        Returns:
            (ml_anomaly_score [0.0 - 100.0], factors)
        """
        factors: List[RiskFactorItem] = []
        fuel_type = plant.fuel_type
        model = self.models.get(fuel_type) or self.models.get(FuelType.SOLAR)

        X = self.extract_features(plant, period_start, period_end, claimed_mwh, meter_reading)
        cf, meter_ratio, density = X[0]

        # Raw score: lower values indicate more abnormal instances
        # decision_function output is roughly in range [-0.5, 0.5] where <0 is outlier
        raw_score = model.decision_function(X)[0]
        # Map raw_score to [0, 100] risk where high = abnormal
        # raw_score 0.2 -> risk 0; raw_score -0.3 -> risk 100
        ml_score = float(np.clip((0.2 - raw_score) / 0.5 * 100.0, 0.0, 100.0))

        # Check statistical deviation against expected profile
        profile = self.PROFILES.get(fuel_type, self.PROFILES[FuelType.SOLAR])
        z_score_cf = abs(cf - profile["mean_cf"]) / profile["std_cf"]

        if ml_score >= 50.0 or z_score_cf > 2.5:
            severity = "CRITICAL" if ml_score >= 75.0 else "HIGH"
            factors.append(
                RiskFactorItem(
                    rule_id="ML-001",
                    name="Statistical Generation Anomaly (Isolation Forest)",
                    category="ML_ANOMALY",
                    severity=severity,
                    score_contribution=ml_score,
                    description=(
                        f"Isolation Forest flagged statistical deviation (Anomaly Score: {ml_score:.1f}/100). "
                        f"Operating capacity factor of {cf:.1%} deviates by {z_score_cf:.1f}σ from plant benchmark."
                    ),
                    flagged=True,
                    evidence_details={
                        "ml_anomaly_score": round(ml_score, 1),
                        "capacity_factor": round(float(cf), 4),
                        "expected_mean_cf": profile["mean_cf"],
                        "z_score": round(float(z_score_cf), 2),
                        "meter_ratio": round(float(meter_ratio), 3),
                    },
                )
            )
        else:
            factors.append(
                RiskFactorItem(
                    rule_id="ML-000",
                    name="ML Baseline Consistency Verified",
                    category="ML_PASS",
                    severity="LOW",
                    score_contribution=0.0,
                    description=f"Generation parameters fit expected {fuel_type.value} operational profile cleanly (Risk: {ml_score:.1f}/100).",
                    flagged=False,
                    evidence_details={"ml_anomaly_score": round(ml_score, 1)},
                )
            )

        return round(ml_score, 1), factors


ml_anomaly_engine = MLAnomalyEngine()
