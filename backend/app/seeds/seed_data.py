import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.plant import Plant, FuelType, PlantStatus
from app.models.meter import MeterReading
from app.models.claim import CertificateClaim, DocumentEvidence, ClaimStatus, RiskLevel, DocumentType
from app.models.certificate import Certificate, CertificateTransfer, CertificateStatus, TransferType
from app.models.investigation import InvestigationCase, CaseStatus, DecisionAction
from app.models.ledger import LedgerBlock, LedgerEventType
from app.engines.rule_engine import compute_submission_fingerprint
from app.engines.risk_engine import RiskFusionEngine
from app.engines.ledger_engine import LedgerEngine


def seed_database(force_reseed: bool = False):
    """Populates the database with test accounts, power facilities, telemetry logs, and fraud scenarios."""
    if force_reseed:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        if not force_reseed and db.query(User).first():
            print("Database already contains records. Skipping seed.")
            return

        print("--> Initializing Genesis block on ledger...")
        LedgerEngine.initialize_genesis_block(db)

        print("--> Seeding test users with RBAC roles...")
        hashed_pwd = get_password_hash("password123")

        admin_user = User(
            email="admin@recguardian.org",
            hashed_password=hashed_pwd,
            full_name="Admin Director",
            organization_name="REC Guardian Authority",
            role=UserRole.ADMIN,
        )
        regulator_user = User(
            email="regulator@recguardian.org",
            hashed_password=hashed_pwd,
            full_name="Elena Rostova",
            organization_name="Renewable Energy Regulatory Commission",
            role=UserRole.REGULATOR,
        )
        auditor_user = User(
            email="auditor@recguardian.org",
            hashed_password=hashed_pwd,
            full_name="Marcus Vance",
            organization_name="Apex Forensic ESG Audit Group",
            role=UserRole.AUDITOR,
        )
        gen_solar = User(
            email="generator@solarfarm.com",
            hashed_password=hashed_pwd,
            full_name="Varun Bajaj",
            organization_name="Helios Solar Generation LLC",
            role=UserRole.GENERATOR,
        )
        gen_wind = User(
            email="generator2@windpower.com",
            hashed_password=hashed_pwd,
            full_name="Kevin Chen",
            organization_name="Boreas Wind Energy Ltd",
            role=UserRole.GENERATOR,
        )
        trader_user = User(
            email="trader@energytrade.com",
            hashed_password=hashed_pwd,
            full_name="Dhruv Patel",
            organization_name="Global Carbon & REC Exchange",
            role=UserRole.GENERATOR,
        )

        db.add_all([admin_user, regulator_user, auditor_user, gen_solar, gen_wind, trader_user])
        db.commit()

        for u in [admin_user, regulator_user, auditor_user, gen_solar, gen_wind, trader_user]:
            db.refresh(u)

        print("--> Seeding renewable power generation plants...")
        now = datetime.now(timezone.utc)

        plant_solar = Plant(
            owner_id=gen_solar.id,
            name="Mojave Desert Solar One",
            fuel_type=FuelType.SOLAR,
            nameplate_capacity_mw=50.0,
            grid_interconnection_id="GRID-CA-MOJ-091",
            location_address="San Bernardino County, CA",
            latitude=34.92,
            longitude=-116.89,
            commissioning_date=now - timedelta(days=700),
            max_capacity_factor=0.35,
            status=PlantStatus.ACTIVE,
        )
        plant_wind = Plant(
            owner_id=gen_wind.id,
            name="Columbia Gorge Wind Facility",
            fuel_type=FuelType.WIND,
            nameplate_capacity_mw=120.0,
            grid_interconnection_id="GRID-OR-CGW-440",
            location_address="Wasco County, OR",
            latitude=45.60,
            longitude=-121.18,
            commissioning_date=now - timedelta(days=500),
            max_capacity_factor=0.55,
            status=PlantStatus.ACTIVE,
        )
        plant_hydro = Plant(
            owner_id=gen_solar.id,
            name="Cascade Mountain Hydro Power",
            fuel_type=FuelType.HYDRO,
            nameplate_capacity_mw=80.0,
            grid_interconnection_id="GRID-WA-CSH-102",
            location_address="Chelan County, WA",
            latitude=47.84,
            longitude=-120.02,
            commissioning_date=now - timedelta(days=1200),
            max_capacity_factor=0.75,
            status=PlantStatus.ACTIVE,
        )

        db.add_all([plant_solar, plant_wind, plant_hydro])
        db.commit()
        for p in [plant_solar, plant_wind, plant_hydro]:
            db.refresh(p)

        print("--> Ingesting smart meter telemetry readings...")
        last_month_start = (now - timedelta(days=30)).replace(hour=0, minute=0, second=0, microsecond=0)
        last_month_end = now.replace(hour=0, minute=0, second=0, microsecond=0)

        # Solar meter: 50 MW * 720 hours * 0.22 CF = ~7,920 MWh
        meter_solar = MeterReading(
            plant_id=plant_solar.id,
            meter_serial_number="SM-SOLAR-CA-9921",
            interval_start=last_month_start,
            interval_end=last_month_end,
            energy_generated_mwh=7850.5,
            raw_meter_hash=hashlib.sha256(b"SM-SOLAR-CA-9921_RAW_7850.5").hexdigest(),
            telemetry_source="UTILITY_SMART_METER",
        )
        # Wind meter: 120 MW * 720 hours * 0.38 CF = ~32,800 MWh
        meter_wind = MeterReading(
            plant_id=plant_wind.id,
            meter_serial_number="SM-WIND-OR-4412",
            interval_start=last_month_start,
            interval_end=last_month_end,
            energy_generated_mwh=31500.0,
            raw_meter_hash=hashlib.sha256(b"SM-WIND-OR-4412_RAW_31500.0").hexdigest(),
            telemetry_source="UTILITY_SMART_METER",
        )
        # Mismatch meter: recorded 1,200 MWh, but generator will claim 3,800 MWh
        meter_mismatch = MeterReading(
            plant_id=plant_solar.id,
            meter_serial_number="SM-SOLAR-CA-9922",
            interval_start=last_month_start - timedelta(days=30),
            interval_end=last_month_start,
            energy_generated_mwh=1200.0,
            raw_meter_hash=hashlib.sha256(b"SM-SOLAR-CA-9922_RAW_1200.0").hexdigest(),
            telemetry_source="UTILITY_SMART_METER",
        )

        db.add_all([meter_solar, meter_wind, meter_mismatch])
        db.commit()
        for m in [meter_solar, meter_wind, meter_mismatch]:
            db.refresh(m)

        print("--> Generating forensic test cases...")

        # -------------------------------------------------------------
        # Scenario 1: Clean Legitimate Solar Claim (Auto-Approved)
        # -------------------------------------------------------------
        doc_hash_1 = hashlib.sha256(b"OFFICIAL_METER_REPORT_SOLAR_MOJAVE_2026").hexdigest()
        risk_1 = RiskFusionEngine.evaluate_claim(
            db=db,
            plant=plant_solar,
            period_start=last_month_start,
            period_end=last_month_end,
            claimed_mwh=7850.0,
            submitted_by_user_id=gen_solar.id,
            meter_reading=meter_solar,
            document_hashes=[doc_hash_1],
        )
        fp_1 = compute_submission_fingerprint(plant_solar.id, last_month_start, last_month_end, 7850.0)

        claim_1 = CertificateClaim(
            claim_uid="CLM-2026-LEGIT-01",
            plant_id=plant_solar.id,
            submitted_by_user_id=gen_solar.id,
            period_start=last_month_start,
            period_end=last_month_end,
            claimed_mwh=7850.0,
            meter_reading_id=meter_solar.id,
            submission_fingerprint=fp_1,
            status=ClaimStatus.APPROVED,
            risk_score=risk_1.final_risk_score,
            risk_level=risk_1.risk_level,
            risk_breakdown=risk_1.model_dump(),
        )
        db.add(claim_1)
        db.flush()

        doc_1 = DocumentEvidence(
            claim_id=claim_1.id,
            document_type=DocumentType.METER_REPORT,
            file_name="mojave_solar_revenue_meter_verified.pdf",
            file_hash=doc_hash_1,
            file_size_bytes=412850,
        )
        db.add(doc_1)

        # Issue Certificate 1
        cert_uid_1 = "REC-2026-SOL-09921"
        cert_1 = Certificate(
            certificate_uid=cert_uid_1,
            claim_id=claim_1.id,
            plant_id=plant_solar.id,
            current_owner_id=gen_solar.id,
            fuel_type=FuelType.SOLAR,
            mwh=7850.0,
            vintage_year=last_month_start.year,
            vintage_month=last_month_start.month,
            status=CertificateStatus.ISSUED,
        )
        db.add(cert_1)
        db.flush()

        tx_hash_1 = hashlib.sha256(f"{cert_uid_1}_ISSUED".encode()).hexdigest()
        tx_1 = CertificateTransfer(
            certificate_id=cert_1.id,
            from_user_id=None,
            to_user_id=gen_solar.id,
            transfer_type=TransferType.ISSUANCE,
            tx_hash=tx_hash_1,
        )
        db.add(tx_1)

        LedgerEngine.record_event(
            db=db,
            event_type=LedgerEventType.CLAIM_SUBMITTED,
            entity_type="CLAIM",
            entity_id=claim_1.claim_uid,
            data_payload={"claim_uid": claim_1.claim_uid, "risk_score": claim_1.risk_score},
        )
        LedgerEngine.record_event(
            db=db,
            event_type=LedgerEventType.CERTIFICATE_ISSUED,
            entity_type="CERTIFICATE",
            entity_id=cert_uid_1,
            data_payload={"certificate_uid": cert_uid_1, "mwh": 7850.0},
        )

        # -------------------------------------------------------------
        # Scenario 2: Meter vs Claim Mismatch Fraud (Overclaim 216%)
        # -------------------------------------------------------------
        prev_period_start = last_month_start - timedelta(days=30)
        prev_period_end = last_month_start
        doc_hash_2 = hashlib.sha256(b"METER_REPORT_TAMPERED_DISCREPANCY_2026").hexdigest()

        risk_2 = RiskFusionEngine.evaluate_claim(
            db=db,
            plant=plant_solar,
            period_start=prev_period_start,
            period_end=prev_period_end,
            claimed_mwh=3800.0,  # Claimed 3800 vs meter 1200 (>216% overclaim)
            submitted_by_user_id=gen_solar.id,
            meter_reading=meter_mismatch,
            document_hashes=[doc_hash_2],
        )
        fp_2 = compute_submission_fingerprint(plant_solar.id, prev_period_start, prev_period_end, 3800.0)

        claim_2 = CertificateClaim(
            claim_uid="CLM-2026-FRAUD-MTR",
            plant_id=plant_solar.id,
            submitted_by_user_id=gen_solar.id,
            period_start=prev_period_start,
            period_end=prev_period_end,
            claimed_mwh=3800.0,
            meter_reading_id=meter_mismatch.id,
            submission_fingerprint=fp_2,
            status=ClaimStatus.HELD,
            risk_score=risk_2.final_risk_score,
            risk_level=risk_2.risk_level,
            risk_breakdown=risk_2.model_dump(),
        )
        db.add(claim_2)
        db.flush()

        case_2 = InvestigationCase(
            case_number="CASE-2026-MTR-001",
            claim_id=claim_2.id,
            assigned_investigator_id=regulator_user.id,
            status=CaseStatus.OPEN,
            priority=RiskLevel.HIGH,
            decision_action=DecisionAction.CONFIRM_FRAUD_HOLD,
            findings="Deterministic rule RULE-005 triggered: Claimed 3,800.0 MWh exceeds smart meter reading of 1,200.0 MWh by 216.7%.",
            notes="Meter serial SM-SOLAR-CA-9922 verified by telemetry server. High probability of meter bypass or fabricated claim.",
        )
        db.add(case_2)

        LedgerEngine.record_event(
            db=db,
            event_type=LedgerEventType.CLAIM_SUBMITTED,
            entity_type="CLAIM",
            entity_id=claim_2.claim_uid,
            data_payload={"claim_uid": claim_2.claim_uid, "risk_score": claim_2.risk_score, "status": "HELD"},
        )
        LedgerEngine.record_event(
            db=db,
            event_type=LedgerEventType.INVESTIGATION_OPENED,
            entity_type="INVESTIGATION",
            entity_id="CASE-2026-MTR-001",
            data_payload={"case_number": "CASE-2026-MTR-001", "claim_uid": claim_2.claim_uid},
        )

        # -------------------------------------------------------------
        # Scenario 3: Physical Capacity Violation (>200% Capacity Factor)
        # -------------------------------------------------------------
        two_months_start = prev_period_start - timedelta(days=30)
        two_months_end = prev_period_start
        # 50 MW plant in 720 hours max physical theoretical generation is 36,000 MWh
        # Claiming 90,000 MWh (250% of absolute physical law)
        risk_3 = RiskFusionEngine.evaluate_claim(
            db=db,
            plant=plant_solar,
            period_start=two_months_start,
            period_end=two_months_end,
            claimed_mwh=90000.0,
            submitted_by_user_id=gen_solar.id,
            meter_reading=None,
        )
        fp_3 = compute_submission_fingerprint(plant_solar.id, two_months_start, two_months_end, 90000.0)

        claim_3 = CertificateClaim(
            claim_uid="CLM-2026-FRAUD-CAP",
            plant_id=plant_solar.id,
            submitted_by_user_id=gen_solar.id,
            period_start=two_months_start,
            period_end=two_months_end,
            claimed_mwh=90000.0,
            meter_reading_id=None,
            submission_fingerprint=fp_3,
            status=ClaimStatus.HELD,
            risk_score=risk_3.final_risk_score,
            risk_level=risk_3.risk_level,
            risk_breakdown=risk_3.model_dump(),
        )
        db.add(claim_3)
        db.flush()

        case_3 = InvestigationCase(
            case_number="CASE-2026-CAP-002",
            claim_id=claim_3.id,
            assigned_investigator_id=regulator_user.id,
            status=CaseStatus.UNDER_INVESTIGATION,
            priority=RiskLevel.CRITICAL,
            decision_action=DecisionAction.CONFIRM_FRAUD_HOLD,
            findings="Deterministic rule RULE-003 triggered: Claimed 90,000.0 MWh exceeds absolute physical plant maximum of 36,000.0 MWh by 150.0%.",
            notes="Physically impossible generation. Plant generator capacity is 50.0 MW.",
        )
        db.add(case_3)

        LedgerEngine.record_event(
            db=db,
            event_type=LedgerEventType.CLAIM_SUBMITTED,
            entity_type="CLAIM",
            entity_id=claim_3.claim_uid,
            data_payload={"claim_uid": claim_3.claim_uid, "risk_score": claim_3.risk_score, "status": "HELD"},
        )

        # -------------------------------------------------------------
        # Scenario 4: Cross-Facility Document Evidence Reuse
        # -------------------------------------------------------------
        # Reusing doc_hash_1 from Solar Mojave under the Wind facility
        risk_4 = RiskFusionEngine.evaluate_claim(
            db=db,
            plant=plant_wind,
            period_start=last_month_start,
            period_end=last_month_end,
            claimed_mwh=31500.0,
            submitted_by_user_id=gen_wind.id,
            meter_reading=meter_wind,
            document_hashes=[doc_hash_1],  # Reused from Mojave solar!
        )
        fp_4 = compute_submission_fingerprint(plant_wind.id, last_month_start, last_month_end, 31500.0)

        claim_4 = CertificateClaim(
            claim_uid="CLM-2026-FRAUD-DOC",
            plant_id=plant_wind.id,
            submitted_by_user_id=gen_wind.id,
            period_start=last_month_start,
            period_end=last_month_end,
            claimed_mwh=31500.0,
            meter_reading_id=meter_wind.id,
            submission_fingerprint=fp_4,
            status=ClaimStatus.HELD,
            risk_score=risk_4.final_risk_score,
            risk_level=risk_4.risk_level,
            risk_breakdown=risk_4.model_dump(),
        )
        db.add(claim_4)
        db.flush()

        doc_reused = DocumentEvidence(
            claim_id=claim_4.id,
            document_type=DocumentType.METER_REPORT,
            file_name="recycled_revenue_meter_doc.pdf",
            file_hash=doc_hash_1,
            file_size_bytes=412850,
        )
        db.add(doc_reused)

        case_4 = InvestigationCase(
            case_number="CASE-2026-DOC-003",
            claim_id=claim_4.id,
            assigned_investigator_id=auditor_user.id,
            status=CaseStatus.OPEN,
            priority=RiskLevel.HIGH,
            decision_action=DecisionAction.PENDING,
            findings=f"RULE-009 triggered: Supporting document hash {doc_hash_1[:12]} was previously submitted under claim CLM-2026-LEGIT-01 for plant Mojave Desert Solar One.",
            notes="Document reused across completely unrelated facilities (Solar vs Wind). High probability of evidence fabrication.",
        )
        db.add(case_4)

        # -------------------------------------------------------------
        # Scenario 5: Circular Transfer Ring (Wash Trading)
        # -------------------------------------------------------------
        # Issue a certificate to Wind Generator, then trade in a circle:
        # gen_wind -> trader_user -> gen_solar -> gen_wind
        # Create legitimate base claim for wind facility to back wash trading demo
        claim_wash_start = last_month_start - timedelta(days=60)
        claim_wash_end = last_month_start - timedelta(days=30)
        fp_wash = compute_submission_fingerprint(plant_wind.id, claim_wash_start, claim_wash_end, 5000.0)
        claim_wash = CertificateClaim(
            claim_uid="CLM-2026-WND-LEGIT-02",
            plant_id=plant_wind.id,
            submitted_by_user_id=gen_wind.id,
            period_start=claim_wash_start,
            period_end=claim_wash_end,
            claimed_mwh=5000.0,
            meter_reading_id=None,
            submission_fingerprint=fp_wash,
            status=ClaimStatus.APPROVED,
            risk_score=14.0,
            risk_level=RiskLevel.LOW,
        )
        db.add(claim_wash)
        db.flush()

        cert_uid_wash = "REC-2026-WND-88319"
        cert_wash = Certificate(
            certificate_uid=cert_uid_wash,
            claim_id=claim_wash.id,
            plant_id=plant_wind.id,
            current_owner_id=gen_wind.id,
            fuel_type=FuelType.WIND,
            mwh=5000.0,
            vintage_year=2026,
            vintage_month=1,
            status=CertificateStatus.TRANSFERRED,
        )
        db.add(cert_wash)
        db.flush()

        tx_c1 = CertificateTransfer(
            certificate_id=cert_wash.id,
            from_user_id=gen_wind.id,
            to_user_id=trader_user.id,
            transfer_type=TransferType.TRANSFER,
            timestamp=now - timedelta(days=5),
            tx_hash=hashlib.sha256(b"WASH_RING_TX_1").hexdigest(),
        )
        tx_c2 = CertificateTransfer(
            certificate_id=cert_wash.id,
            from_user_id=trader_user.id,
            to_user_id=gen_solar.id,
            transfer_type=TransferType.TRANSFER,
            timestamp=now - timedelta(days=3),
            tx_hash=hashlib.sha256(b"WASH_RING_TX_2").hexdigest(),
        )
        tx_c3 = CertificateTransfer(
            certificate_id=cert_wash.id,
            from_user_id=gen_solar.id,
            to_user_id=gen_wind.id,
            transfer_type=TransferType.TRANSFER,
            timestamp=now - timedelta(days=1),
            tx_hash=hashlib.sha256(b"WASH_RING_TX_3").hexdigest(),
        )
        db.add_all([tx_c1, tx_c2, tx_c3])

        # Record transfers on ledger
        for idx, tx_elem in enumerate([tx_c1, tx_c2, tx_c3]):
            LedgerEngine.record_event(
                db=db,
                event_type=LedgerEventType.CERTIFICATE_TRANSFERRED,
                entity_type="CERTIFICATE",
                entity_id=cert_uid_wash,
                data_payload={
                    "certificate_uid": cert_uid_wash,
                    "from_user_id": tx_elem.from_user_id,
                    "to_user_id": tx_elem.to_user_id,
                    "tx_hash": tx_elem.tx_hash,
                    "leg": idx + 1,
                },
            )

        # -------------------------------------------------------------
        # Scenario 5: Weather Oracle Anomaly ("Phantom Solar Claim" under Heavy Overcast)
        # -------------------------------------------------------------
        monsoon_start = datetime(2026, 7, 10, 0, 0, 0, tzinfo=timezone.utc)
        monsoon_end = datetime(2026, 7, 10, 23, 59, 59, tzinfo=timezone.utc)
        risk_wth = RiskFusionEngine.evaluate_claim(
            db=db,
            plant=plant_solar,
            period_start=monsoon_start,
            period_end=monsoon_end,
            claimed_mwh=950.0,  # Exceeds maximum feasible under monsoon cloud cover (~248 MWh)
            submitted_by_user_id=gen_solar.id,
        )
        fp_wth = compute_submission_fingerprint(plant_solar.id, monsoon_start, monsoon_end, 950.0)
        claim_wth = CertificateClaim(
            claim_uid="CLM-2026-FRAUD-WTH",
            plant_id=plant_solar.id,
            submitted_by_user_id=gen_solar.id,
            period_start=monsoon_start,
            period_end=monsoon_end,
            claimed_mwh=950.0,
            submission_fingerprint=fp_wth,
            status=ClaimStatus.HELD,
            risk_score=risk_wth.final_risk_score,
            risk_level=risk_wth.risk_level,
            risk_breakdown=risk_wth.model_dump(),
        )
        db.add(claim_wth)
        db.flush()

        case_wth = InvestigationCase(
            case_number="CASE-2026-WTH-001",
            claim_id=claim_wth.id,
            assigned_investigator_id=regulator_user.id,
            status=CaseStatus.OPEN,
            priority=RiskLevel.HIGH,
            decision_action=DecisionAction.CONFIRM_FRAUD_HOLD,
            findings="RULE-011 triggered: Claimed 950.0 MWh exceeds meteorological solar irradiance limit under monsoon cloud cover (Copernicus CAMS & NASA POWER Reanalysis).",
            notes="Ground-truth satellite reanalysis indicates heavy monsoon cloud cover (35% standard insolation). Claimed energy is meteorologically impossible.",
        )
        db.add(case_wth)

        # -------------------------------------------------------------
        # Scenario 6: Overlapping Generation Interval ("Time-Slice Double Counting")
        # -------------------------------------------------------------
        overlap_start = last_month_start + timedelta(days=10)
        overlap_end = last_month_start + timedelta(days=25)
        risk_ovl = RiskFusionEngine.evaluate_claim(
            db=db,
            plant=plant_solar,
            period_start=overlap_start,
            period_end=overlap_end,
            claimed_mwh=3200.0,
            submitted_by_user_id=gen_solar.id,
        )
        fp_ovl = compute_submission_fingerprint(plant_solar.id, overlap_start, overlap_end, 3200.0)
        claim_ovl = CertificateClaim(
            claim_uid="CLM-2026-FRAUD-OVL",
            plant_id=plant_solar.id,
            submitted_by_user_id=gen_solar.id,
            period_start=overlap_start,
            period_end=overlap_end,
            claimed_mwh=3200.0,
            submission_fingerprint=fp_ovl,
            status=ClaimStatus.HELD,
            risk_score=risk_ovl.final_risk_score,
            risk_level=risk_ovl.risk_level,
            risk_breakdown=risk_ovl.model_dump(),
        )
        db.add(claim_ovl)
        db.flush()

        case_ovl = InvestigationCase(
            case_number="CASE-2026-OVL-001",
            claim_id=claim_ovl.id,
            assigned_investigator_id=regulator_user.id,
            status=CaseStatus.OPEN,
            priority=RiskLevel.CRITICAL,
            decision_action=DecisionAction.CONFIRM_FRAUD_HOLD,
            findings=f"RULE-012 triggered: Generation interval overlaps previously submitted and approved claim {claim_1.claim_uid} by 360.0 hours.",
            notes="Time-slice slicing detected. The generator attempted to double-claim the middle 15 days of the previous vintage month.",
        )
        db.add(case_ovl)

        # -------------------------------------------------------------
        # Scenario 7: Nocturnal Solar Generation Violation
        # -------------------------------------------------------------
        night_start = datetime(2026, 8, 15, 22, 0, 0, tzinfo=timezone.utc)
        night_end = datetime(2026, 8, 16, 4, 0, 0, tzinfo=timezone.utc)
        risk_noc = RiskFusionEngine.evaluate_claim(
            db=db,
            plant=plant_solar,
            period_start=night_start,
            period_end=night_end,
            claimed_mwh=210.0,
            submitted_by_user_id=gen_solar.id,
        )
        fp_noc = compute_submission_fingerprint(plant_solar.id, night_start, night_end, 210.0)
        claim_noc = CertificateClaim(
            claim_uid="CLM-2026-FRAUD-NOC",
            plant_id=plant_solar.id,
            submitted_by_user_id=gen_solar.id,
            period_start=night_start,
            period_end=night_end,
            claimed_mwh=210.0,
            submission_fingerprint=fp_noc,
            status=ClaimStatus.HELD,
            risk_score=risk_noc.final_risk_score,
            risk_level=risk_noc.risk_level,
            risk_breakdown=risk_noc.model_dump(),
        )
        db.add(claim_noc)
        db.flush()

        case_noc = InvestigationCase(
            case_number="CASE-2026-NOC-001",
            claim_id=claim_noc.id,
            assigned_investigator_id=regulator_user.id,
            status=CaseStatus.OPEN,
            priority=RiskLevel.CRITICAL,
            decision_action=DecisionAction.CONFIRM_FRAUD_HOLD,
            findings="RULE-013 triggered: Claimed 210.0 MWh solar generation strictly between 22:00 and 04:00 (nighttime).",
            notes="Physical impossibility. Solar photovoltaic panels produce zero electricity at night. Clear sign of falsified synthetic meter logs.",
        )
        db.add(case_noc)

        db.commit()
        print("--> Database successfully seeded with full forensic fraud scenarios!")

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
