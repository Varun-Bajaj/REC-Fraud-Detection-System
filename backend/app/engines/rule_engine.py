import math
import hashlib
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session

from app.config import settings
from app.models.plant import Plant, FuelType
from app.models.meter import MeterReading
from app.models.claim import CertificateClaim, DocumentEvidence, ClaimStatus
from app.schemas.risk import RiskFactorItem
from app.services.weather_oracle import WeatherOracleService


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

        # -------------------------------------------------------------
        # 6. Environmental Weather & Solar Irradiance Ground Truth
        # -------------------------------------------------------------
        weather_eval = WeatherOracleService.evaluate_generation_feasibility(
            fuel_type=plant.fuel_type,
            nameplate_capacity_mw=plant.nameplate_capacity_mw,
            claimed_mwh=claimed_mwh,
            period_start=start_utc,
            period_end=end_utc,
            latitude=plant.latitude,
            longitude=plant.longitude,
        )
        if not weather_eval["is_feasible"]:
            discrepancy = weather_eval.get("discrepancy_pct", 0.0)
            score_contrib = 85.0 if discrepancy > 30.0 else 50.0
            sev = "CRITICAL" if discrepancy > 30.0 else "HIGH"
            if discrepancy > 30.0:
                has_critical_override = True
            rule_score += score_contrib
            factors.append(
                RiskFactorItem(
                    rule_id="RULE-011",
                    name="Environmental Weather Infeasibility (Phantom Generation)",
                    category="METEOROLOGICAL_CHECK",
                    severity=sev,
                    score_contribution=score_contrib,
                    description=weather_eval["reason"],
                    flagged=True,
                    evidence_details=weather_eval,
                )
            )

        # -------------------------------------------------------------
        # 7. Overlapping Generation Interval (Time-Slice Double Counting)
        # -------------------------------------------------------------
        overlap_query = db.query(CertificateClaim).filter(
            CertificateClaim.plant_id == plant.id,
            CertificateClaim.period_start < end_utc,
            CertificateClaim.period_end > start_utc,
            CertificateClaim.status != ClaimStatus.REJECTED,
        )
        if current_claim_id:
            overlap_query = overlap_query.filter(CertificateClaim.id != current_claim_id)

        overlapping_claims = overlap_query.all()
        # Filter out if it was already caught by exact fingerprint (RULE-008)
        overlapping_claims = [
            c for c in overlapping_claims
            if not (c.period_start == start_utc and c.period_end == end_utc and c.claimed_mwh == claimed_mwh)
        ]

        if overlapping_claims:
            for conf_claim in overlapping_claims[:2]:
                conf_start = conf_claim.period_start.replace(tzinfo=timezone.utc) if conf_claim.period_start.tzinfo is None else conf_claim.period_start
                conf_end = conf_claim.period_end.replace(tzinfo=timezone.utc) if conf_claim.period_end.tzinfo is None else conf_claim.period_end
                overlap_start = max(start_utc, conf_start)
                overlap_end = min(end_utc, conf_end)
                overlap_hours = max((overlap_end - overlap_start).total_seconds() / 3600.0, 0.0)

                if overlap_hours > 0.5:
                    rule_score += 85.0
                    has_critical_override = True
                    factors.append(
                        RiskFactorItem(
                            rule_id="RULE-012",
                            name="Overlapping Generation Window Claim (Time Slicing)",
                            category="DUPLICATE_CHECK",
                            severity="CRITICAL",
                            score_contribution=85.0,
                            description=(
                                f"Generation interval overlaps by {overlap_hours:.1f} hours with previously submitted "
                                f"claim {conf_claim.claim_uid} (time-slice double-counting risk)."
                            ),
                            flagged=True,
                            evidence_details={
                                "conflicting_claim_uid": conf_claim.claim_uid,
                                "overlap_hours": round(overlap_hours, 2),
                                "overlap_start": overlap_start.isoformat(),
                                "overlap_end": overlap_end.isoformat(),
                            },
                        )
                    )

        # -------------------------------------------------------------
        # 8. Diurnal Waveform & Nocturnal Solar Check
        # -------------------------------------------------------------
        if plant.fuel_type == FuelType.SOLAR and claimed_mwh > 0:
            duration_hrs = (end_utc - start_utc).total_seconds() / 3600.0
            if duration_hrs <= 12.0:
                is_start_night = start_utc.hour >= 20 or start_utc.hour < 5
                is_end_night = end_utc.hour >= 20 or end_utc.hour <= 5
                if is_start_night and is_end_night:
                    rule_score += 90.0
                    has_critical_override = True
                    factors.append(
                        RiskFactorItem(
                            rule_id="RULE-013",
                            name="Nocturnal Solar Generation Violation",
                            category="PHYSICS_CHECK",
                            severity="CRITICAL",
                            score_contribution=90.0,
                            description=(
                                f"Claimed {claimed_mwh:.2f} MWh solar generation strictly during nocturnal hours "
                                f"({start_utc.strftime('%H:%M')} to {end_utc.strftime('%H:%M')}). Zero solar irradiance exists at night."
                            ),
                            flagged=True,
                            evidence_details={
                                "start_hour_utc": start_utc.hour,
                                "end_hour_utc": end_utc.hour,
                                "fuel_type": "SOLAR",
                            },
                        )
                    )

        # -------------------------------------------------------------
        # 9. Spatial Geo-Colocation Collusion (Haversine Proximity Check)
        # -------------------------------------------------------------
        if plant.latitude is not None and plant.longitude is not None:
            all_plants = db.query(Plant).filter(Plant.id != plant.id).all()
            for other_plant in all_plants:
                if other_plant.latitude is not None and other_plant.longitude is not None:
                    R = 6371.0  # Earth radius in km
                    dlat = math.radians(other_plant.latitude - plant.latitude)
                    dlon = math.radians(other_plant.longitude - plant.longitude)
                    a = (
                        math.sin(dlat / 2) ** 2
                        + math.cos(math.radians(plant.latitude))
                        * math.cos(math.radians(other_plant.latitude))
                        * math.sin(dlon / 2) ** 2
                    )
                    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
                    distance_km = R * c

                    cap_ratio = abs(plant.nameplate_capacity_mw - other_plant.nameplate_capacity_mw) / max(plant.nameplate_capacity_mw, 0.1)
                    if distance_km <= 1.5 and plant.fuel_type == other_plant.fuel_type and cap_ratio <= 0.15:
                        rule_score += 70.0
                        factors.append(
                            RiskFactorItem(
                                rule_id="RULE-014",
                                name="Spatial Geo-Colocation Collusion (Multi-Registry Double Registration)",
                                category="GEOSPATIAL_CHECK",
                                severity="HIGH",
                                score_contribution=70.0,
                                description=(
                                    f"Facility is located within {distance_km:.2f} km of facility '{other_plant.name}' "
                                    f"with identical {plant.fuel_type.value} fuel type and capacity ({plant.nameplate_capacity_mw} MW vs {other_plant.nameplate_capacity_mw} MW). "
                                    f"Potential duplicate facility registration across registries."
                                ),
                                flagged=True,
                                evidence_details={
                                    "distance_km": round(distance_km, 3),
                                    "conflicting_plant_id": other_plant.id,
                                    "conflicting_plant_name": other_plant.name,
                                    "conflicting_grid_id": other_plant.grid_interconnection_id,
                                },
                            )
                        )
                        break

        # If no flags triggered, add a positive factor
        if not factors:
            factors.append(
                RiskFactorItem(
                    rule_id="RULE-000",
                    name="Deterministic Verification Passed",
                    category="RULE_PASS",
                    severity="LOW",
                    score_contribution=0.0,
                    description="All deterministic physical, meter, duplicate, weather, and documentation rules passed cleanly.",
                    flagged=False,
                )
            )

        normalized_score = min(100.0, rule_score)
        return normalized_score, factors, has_critical_override
