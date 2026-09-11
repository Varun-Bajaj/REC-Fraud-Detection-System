import hashlib
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session

from app.config import settings
from app.models.plant import Plant, FuelType
from app.models.meter import MeterReading
from app.models.claim import CertificateClaim, DocumentEvidence, ClaimStatus
from app.schemas.risk import RiskFactorItem


def compute_submission_fingerprint(plant_id: int, start: datetime, end: datetime, mwh: float) -> str:
    """Generate deterministic SHA-256 fingerprint for a claim payload."""
    start_str = start.strftime("%Y-%m-%dT%H:%M:%SZ")
    end_str = end.strftime("%Y-%m-%dT%H:%M:%SZ")
    payload = f"{plant_id}_{start_str}_{end_str}_{round(mwh, 4)}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


class RuleEngine:
    """
    Deterministic rule engine that scans claims for physical and logical red flags:
    - Meter vs Claim Discrepancy
    - Plant Capacity & Generation Physics Violations
    - Exact Duplicate Claim Detection
    - Cross-Facility Document Evidence Hash Reuse
    - Timeline & Vintage Inconsistencies
    """

    @classmethod
    def evaluate(
        cls,
        db: Session,
        plant: Plant,
        period_start: datetime,
        period_end: datetime,
        claimed_mwh: float,
        meter_reading: Optional[MeterReading] = None,
        document_hashes: Optional[List[str]] = None,
        current_claim_id: Optional[int] = None,
    ) -> Tuple[float, List[RiskFactorItem], bool]:
        """
        Evaluates deterministic rules.
        Returns:
            (rule_score [0.0 - 100.0], factors, has_critical_override)
        """
        factors: List[RiskFactorItem] = []
        rule_score = 0.0
        has_critical_override = False

        # -------------------------------------------------------------
        # 1. Timeline & Vintage Integrity
        # -------------------------------------------------------------
        now = datetime.now(timezone.utc)
        start_utc = period_start.replace(tzinfo=timezone.utc) if period_start.tzinfo is None else period_start
        end_utc = period_end.replace(tzinfo=timezone.utc) if period_end.tzinfo is None else period_end

        if end_utc <= start_utc:
            rule_score += 100.0
            has_critical_override = True
            factors.append(
                RiskFactorItem(
                    rule_id="RULE-001",
                    name="Invalid Claim Period Timeline",
                    category="TIMELINE_CHECK",
                    severity="CRITICAL",
                    score_contribution=100.0,
                    description="Claim period end date is earlier than or equal to start date.",
                    flagged=True,
                    evidence_details={"start": str(period_start), "end": str(period_end)},
                )
            )

        if end_utc > now:
            rule_score += 40.0
            factors.append(
                RiskFactorItem(
                    rule_id="RULE-002",
                    name="Future Period Claimed",
                    category="TIMELINE_CHECK",
                    severity="HIGH",
                    score_contribution=40.0,
                    description="Claim generation period extends into the future.",
                    flagged=True,
                    evidence_details={"period_end": str(period_end), "current_time": str(now)},
                )
            )

        # -------------------------------------------------------------
        # 2. Plant Theoretical Capacity Violation
        # -------------------------------------------------------------
        duration_hours = max((end_utc - start_utc).total_seconds() / 3600.0, 1.0)
        max_possible_mwh = plant.nameplate_capacity_mw * duration_hours * 1.0
        fuel_factor = plant.max_capacity_factor or (
            settings.MAX_SOLAR_CAPACITY_FACTOR if plant.fuel_type == FuelType.SOLAR else
            settings.MAX_WIND_CAPACITY_FACTOR if plant.fuel_type == FuelType.WIND else
            settings.MAX_HYDRO_CAPACITY_FACTOR if plant.fuel_type == FuelType.HYDRO else 0.50
        )
        max_realistic_mwh = plant.nameplate_capacity_mw * duration_hours * fuel_factor

        if claimed_mwh > max_possible_mwh:
            # Physically impossible generation (exceeds 100% capacity factor)
            overage_pct = ((claimed_mwh - max_possible_mwh) / max_possible_mwh) * 100
            rule_score += 90.0
            has_critical_override = True
            factors.append(
                RiskFactorItem(
                    rule_id="RULE-003",
                    name="Physical Plant Capacity Exceeded (>100% CF)",
                    category="CAPACITY_CHECK",
                    severity="CRITICAL",
                    score_contribution=90.0,
                    description=f"Claimed {claimed_mwh:.2f} MWh exceeds absolute physical plant maximum of {max_possible_mwh:.2f} MWh by {overage_pct:.1f}%.",
                    flagged=True,
                    evidence_details={
                        "claimed_mwh": claimed_mwh,
                        "nameplate_capacity_mw": plant.nameplate_capacity_mw,
                        "duration_hours": duration_hours,
                        "absolute_max_mwh": max_possible_mwh,
                    },
                )
            )
        elif claimed_mwh > max_realistic_mwh:
            # Exceeds typical operational capacity factor for this renewable type
            calculated_cf = claimed_mwh / (plant.nameplate_capacity_mw * duration_hours)
            rule_score += 45.0
            factors.append(
                RiskFactorItem(
                    rule_id="RULE-004",
                    name="Realistic Capacity Factor Exceeded",
                    category="CAPACITY_CHECK",
                    severity="HIGH",
                    score_contribution=45.0,
                    description=f"Claimed capacity factor of {calculated_cf:.1%} exceeds plant expected max of {fuel_factor:.1%}.",
                    flagged=True,
                    evidence_details={
                        "calculated_capacity_factor": calculated_cf,
                        "expected_max_capacity_factor": fuel_factor,
                        "fuel_type": plant.fuel_type.value,
                    },
                )
            )

        # -------------------------------------------------------------
        # 3. Meter vs Claim Discrepancy
        # -------------------------------------------------------------
        if meter_reading is not None:
            metered_mwh = meter_reading.energy_generated_mwh
            if metered_mwh > 0:
                discrepancy_mwh = claimed_mwh - metered_mwh
                discrepancy_pct = (discrepancy_mwh / metered_mwh) * 100.0

                if discrepancy_pct > settings.METER_DISCREPANCY_TOLERANCE_PERCENT:
                    sev = "CRITICAL" if discrepancy_pct > 25.0 else ("HIGH" if discrepancy_pct > 10.0 else "MEDIUM")
                    score_contrib = 80.0 if discrepancy_pct > 25.0 else (50.0 if discrepancy_pct > 10.0 else 25.0)
                    if discrepancy_pct > 25.0:
                        has_critical_override = True

                    factors.append(
                        RiskFactorItem(
                            rule_id="RULE-005",
                            name="Meter vs. Claim Mismatch",
                            category="METER_CHECK",
                            severity=sev,
                            score_contribution=score_contrib,
                            description=f"Claimed {claimed_mwh:.2f} MWh exceeds smart meter reading of {metered_mwh:.2f} MWh by {discrepancy_pct:.2f}%.",
                            flagged=True,
                            evidence_details={
                                "claimed_mwh": claimed_mwh,
                                "metered_mwh": metered_mwh,
                                "discrepancy_mwh": discrepancy_mwh,
                                "discrepancy_percent": round(discrepancy_pct, 2),
                                "meter_serial_number": meter_reading.meter_serial_number,
                            },
                        )
                    )
                    rule_score += score_contrib
            else:
                rule_score += 40.0
                factors.append(
                    RiskFactorItem(
                        rule_id="RULE-006",
                        name="Zero Generation Meter Attached",
                        category="METER_CHECK",
                        severity="HIGH",
                        score_contribution=40.0,
                        description="Meter reading records 0.0 MWh generation, but energy was claimed.",
                        flagged=True,
                        evidence_details={"meter_reading_id": meter_reading.id},
                    )
                )
        else:
            # Unmetered claim submission
            rule_score += 30.0
            factors.append(
                RiskFactorItem(
                    rule_id="RULE-007",
                    name="Unverified / Unmetered Claim",
                    category="METER_CHECK",
                    severity="MEDIUM",
                    score_contribution=30.0,
                    description="No verified utility smart meter reading was attached to this claim.",
                    flagged=True,
                )
            )

        # -------------------------------------------------------------
        # 4. Duplicate Claim Detection (Fingerprint Check)
        # -------------------------------------------------------------
        fingerprint = compute_submission_fingerprint(plant.id, period_start, period_end, claimed_mwh)
        dup_query = db.query(CertificateClaim).filter(
            CertificateClaim.submission_fingerprint == fingerprint,
            CertificateClaim.status != ClaimStatus.REJECTED,
        )
        if current_claim_id:
            dup_query = dup_query.filter(CertificateClaim.id != current_claim_id)
        duplicate_claim = dup_query.first()

        if duplicate_claim:
            rule_score += 95.0
            has_critical_override = True
            factors.append(
                RiskFactorItem(
                    rule_id="RULE-008",
                    name="Exact Duplicate Claim Detected",
                    category="DUPLICATE_CHECK",
                    severity="CRITICAL",
                    score_contribution=95.0,
                    description=f"Identical generation period and MWh previously submitted under claim {duplicate_claim.claim_uid}.",
                    flagged=True,
                    evidence_details={
                        "conflicting_claim_uid": duplicate_claim.claim_uid,
                        "conflicting_claim_id": duplicate_claim.id,
                        "conflicting_status": duplicate_claim.status.value,
                    },
                )
            )

        # -------------------------------------------------------------
        # 5. Cross-Facility Document Evidence Hash Reuse
        # -------------------------------------------------------------
        if document_hashes:
            for doc_hash in document_hashes:
                reused_doc_query = (
                    db.query(DocumentEvidence)
                    .join(CertificateClaim, DocumentEvidence.claim_id == CertificateClaim.id)
                    .filter(
                        DocumentEvidence.file_hash == doc_hash,
                    )
                )
                if current_claim_id:
                    reused_doc_query = reused_doc_query.filter(DocumentEvidence.claim_id != current_claim_id)

                reused_match = reused_doc_query.first()
                if reused_match:
                    rule_score += 75.0
                    has_critical_override = True
                    factors.append(
                        RiskFactorItem(
                            rule_id="RULE-009",
                            name="Document Hash Reused Across Claims",
                            category="DOCUMENT_CHECK",
                            severity="CRITICAL",
                            score_contribution=75.0,
                            description=f"Supporting document (SHA: {doc_hash[:12]}...) previously submitted for claim {reused_match.claim.claim_uid}.",
                            flagged=True,
                            evidence_details={
                                "reused_file_hash": doc_hash,
                                "original_claim_uid": reused_match.claim.claim_uid,
                                "original_claim_id": reused_match.claim_id,
                                "original_file_name": reused_match.file_name,
                            },
                        )
                    )

        # If no flags triggered, add a positive factor
        if not factors:
            factors.append(
                RiskFactorItem(
                    rule_id="RULE-000",
                    name="Deterministic Verification Passed",
                    category="RULE_PASS",
                    severity="LOW",
                    score_contribution=0.0,
                    description="All deterministic physical, meter, duplicate, and documentation rules passed cleanly.",
                    flagged=False,
                )
            )

        normalized_score = min(100.0, rule_score)
        return normalized_score, factors, has_critical_override
