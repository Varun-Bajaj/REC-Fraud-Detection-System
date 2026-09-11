import hashlib
from datetime import datetime, timedelta, timezone
from app.models.plant import Plant, FuelType
from app.models.meter import MeterReading
from app.engines.rule_engine import RuleEngine, compute_submission_fingerprint
from app.engines.ml_engine import ml_anomaly_engine
from app.engines.graph_engine import GraphAnalysisEngine
from app.engines.risk_engine import RiskFusionEngine
from app.engines.ledger_engine import LedgerEngine
from app.models.ledger import LedgerBlock


def test_rule_engine_meter_mismatch(db_session):
    """Test that RuleEngine catches when claimed MWh significantly exceeds metered MWh."""
    plant = db_session.query(Plant).filter(Plant.fuel_type == FuelType.SOLAR).first()
    assert plant is not None

    now = datetime.now(timezone.utc)
    meter = MeterReading(
        plant_id=plant.id,
        meter_serial_number="TEST-MTR-001",
        interval_start=now - timedelta(days=7),
        interval_end=now,
        energy_generated_mwh=100.0,
    )

    # Claim 250 MWh when meter only shows 100 MWh (+150% overclaim)
    score, factors, has_override = RuleEngine.evaluate(
        db=db_session,
        plant=plant,
        period_start=now - timedelta(days=7),
        period_end=now,
        claimed_mwh=250.0,
        meter_reading=meter,
    )

    assert score >= 50.0
    mismatch_factors = [f for f in factors if f.rule_id == "RULE-005"]
    assert len(mismatch_factors) == 1
    assert mismatch_factors[0].flagged is True
    assert "exceeds smart meter reading" in mismatch_factors[0].description


def test_rule_engine_capacity_violation(db_session):
    """Test that RuleEngine catches generation exceeding physical plant capacity."""
    plant = db_session.query(Plant).filter(Plant.fuel_type == FuelType.SOLAR).first()
    now = datetime.now(timezone.utc)

    # 50 MW plant over 24 hours can produce max 1,200 MWh at 100% CF
    # Claiming 5,000 MWh in 24 hours is physically impossible
    score, factors, has_override = RuleEngine.evaluate(
        db=db_session,
        plant=plant,
        period_start=now - timedelta(hours=24),
        period_end=now,
        claimed_mwh=5000.0,
    )

    assert score >= 90.0
    assert has_override is True
    cap_factors = [f for f in factors if f.rule_id == "RULE-003"]
    assert len(cap_factors) == 1
    assert cap_factors[0].severity == "CRITICAL"


def test_ml_anomaly_engine():
    """Test that Isolation Forest ML engine assigns low risk to normal claims and high risk to outliers."""
    now = datetime.now(timezone.utc)
    mock_plant = Plant(
        id=999,
        fuel_type=FuelType.SOLAR,
        nameplate_capacity_mw=10.0,
        max_capacity_factor=0.35,
    )

    # Normal generation for 10 MW solar over 720 hours (month): ~1,500 MWh (CF ~0.21)
    score_normal, factors_normal = ml_anomaly_engine.evaluate(
        plant=mock_plant,
        period_start=now - timedelta(days=30),
        period_end=now,
        claimed_mwh=1500.0,
    )

    # Extreme generation: 10 MW solar claiming 8,000 MWh over 720 hours (CF > 1.1)
    score_outlier, factors_outlier = ml_anomaly_engine.evaluate(
        plant=mock_plant,
        period_start=now - timedelta(days=30),
        period_end=now,
        claimed_mwh=8000.0,
    )

    assert score_outlier > score_normal
    assert score_outlier >= 50.0


def test_graph_engine_cycle_detection(db_session):
    """Test that NetworkX graph engine detects seeded circular wash loops."""
    # From seed data, gen_wind, trader_user, and gen_solar form a cycle
    G = GraphAnalysisEngine.build_transfer_graph(db_session)
    assert G.number_of_nodes() >= 3

    # Check user who is part of the cycle
    from app.models.user import User
    gen_wind = db_session.query(User).filter(User.email == "generator2@windpower.com").first()
    score, factors, cycles = GraphAnalysisEngine.evaluate_account(db_session, gen_wind.id)

    assert score >= 80.0
    assert len(cycles) > 0
    wash_factors = [f for f in factors if f.rule_id == "GRAPH-001"]
    assert len(wash_factors) == 1


def test_ledger_tamper_detection(db_session):
    """Test that LedgerEngine cryptographic SHA-256 audit verifies valid chain and detects tampering."""
    # 1. Clean verification
    result = LedgerEngine.verify_integrity(db_session)
    assert result.is_valid is True
    assert result.tampered_block_index is None

    # 2. Simulate malicious tampering of block #1 payload
    block_1 = db_session.query(LedgerBlock).filter(LedgerBlock.index == 1).first()
    if block_1:
        original_payload = dict(block_1.data_payload)
        block_1.data_payload = {"malicious_tampered_claim": True}
        db_session.commit()

        # Audit should instantly flag tampering
        tampered_result = LedgerEngine.verify_integrity(db_session)
        assert tampered_result.is_valid is False
        assert tampered_result.tampered_block_index == 1
        assert "corruption" in tampered_result.verification_message.lower()

        # Restore original payload
        block_1.data_payload = original_payload
        db_session.commit()

        # Verify it restores to valid
        restored_result = LedgerEngine.verify_integrity(db_session)
        assert restored_result.is_valid is True


def test_rule_engine_duplicate_detection(db_session):
    """Test that RuleEngine catches exact duplicate submissions."""
    from app.models.claim import CertificateClaim
    existing_claim = db_session.query(CertificateClaim).first()
    assert existing_claim is not None

    score, factors, has_override = RuleEngine.evaluate(
        db=db_session,
        plant=existing_claim.plant,
        period_start=existing_claim.period_start,
        period_end=existing_claim.period_end,
        claimed_mwh=existing_claim.claimed_mwh,
    )
    assert score >= 90.0
    assert has_override is True
    dup_factors = [f for f in factors if f.rule_id == "RULE-008"]
    assert len(dup_factors) == 1
    assert "Duplicate Claim Detected" in dup_factors[0].name


def test_rule_engine_document_reuse(db_session):
    """Test that RuleEngine catches document hash reuse across claims."""
    from app.models.claim import DocumentEvidence
    existing_doc = db_session.query(DocumentEvidence).first()
    assert existing_doc is not None

    plant = db_session.query(Plant).filter(Plant.fuel_type == FuelType.WIND).first()
    now = datetime.now(timezone.utc)

    score, factors, has_override = RuleEngine.evaluate(
        db=db_session,
        plant=plant,
        period_start=now - timedelta(days=20),
        period_end=now - timedelta(days=5),
        claimed_mwh=500.0,
        document_hashes=[existing_doc.file_hash],
    )

    doc_factors = [f for f in factors if f.rule_id == "RULE-009"]
    assert len(doc_factors) == 1
    assert "Document Hash Reused" in doc_factors[0].name

