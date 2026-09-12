from datetime import datetime, timedelta, timezone
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.plant import Plant, FuelType, PlantStatus
from app.models.claim import CertificateClaim, ClaimStatus
from app.models.user import User, UserRole
from app.engines.rule_engine import RuleEngine, compute_submission_fingerprint
from app.services.weather_oracle import WeatherOracleService


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # Seed test user & solar plant
    user = User(
        email="test_gen@rec.com",
        hashed_password="hash",
        full_name="Solar Producer",
        role=UserRole.GENERATOR,
    )
    session.add(user)
    session.flush()

    solar_plant = Plant(
        owner_id=user.id,
        name="Thar Solar Park",
        fuel_type=FuelType.SOLAR,
        nameplate_capacity_mw=50.0,
        grid_interconnection_id="GRID-THAR-001",
        latitude=26.9124,
        longitude=70.9015,
        status=PlantStatus.ACTIVE,
    )
    session.add(solar_plant)
    session.commit()

    yield session
    session.close()


def test_weather_oracle_feasibility():
    """Verify Weather Oracle calculates solar irradiance and detects impossible solar claims."""
    # Under heavy overcast/monsoon, 50 MW plant claiming 950 MWh in 24 hours is physically infeasible
    monsoon_start = datetime(2026, 7, 10, 0, 0, 0, tzinfo=timezone.utc)
    monsoon_end = datetime(2026, 7, 10, 23, 59, 59, tzinfo=timezone.utc)

    eval_result = WeatherOracleService.evaluate_generation_feasibility(
        fuel_type=FuelType.SOLAR,
        nameplate_capacity_mw=50.0,
        claimed_mwh=950.0,
        period_start=monsoon_start,
        period_end=monsoon_end,
        latitude=26.9124,
        longitude=70.9015,
    )
    assert not eval_result["is_feasible"]
    assert eval_result["discrepancy_pct"] > 0
    assert "exceeds meteorological solar irradiance limit" in eval_result["reason"]


def test_nocturnal_solar_generation_rule(db_session):
    """Verify RULE-013 triggers when a solar farm claims generation during the night."""
    plant = db_session.query(Plant).first()
    night_start = datetime(2026, 8, 15, 22, 0, 0, tzinfo=timezone.utc)
    night_end = datetime(2026, 8, 16, 4, 0, 0, tzinfo=timezone.utc)

    score, factors, has_critical = RuleEngine.evaluate(
        db=db_session,
        plant=plant,
        period_start=night_start,
        period_end=night_end,
        claimed_mwh=150.0,
    )

    rule_ids = [f.rule_id for f in factors]
    assert "RULE-013" in rule_ids
    assert has_critical is True
    assert score >= 90.0


def test_time_slice_overlap_rule(db_session):
    """Verify RULE-012 triggers when an overlapping generation window is submitted."""
    plant = db_session.query(Plant).first()
    user = db_session.query(User).first()

    # Pre-existing approved claim: Jan 1 to Jan 20
    start_1 = datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    end_1 = datetime(2026, 1, 20, 0, 0, 0, tzinfo=timezone.utc)
    fp_1 = compute_submission_fingerprint(plant.id, start_1, end_1, 1000.0)

    claim_1 = CertificateClaim(
        claim_uid="CLM-BASE-01",
        plant_id=plant.id,
        submitted_by_user_id=user.id,
        period_start=start_1,
        period_end=end_1,
        claimed_mwh=1000.0,
        submission_fingerprint=fp_1,
        status=ClaimStatus.APPROVED,
    )
    db_session.add(claim_1)
    db_session.commit()

    # New claim: Jan 10 to Jan 30 (Overlaps Jan 10-20 by 10 days / 240 hours)
    start_2 = datetime(2026, 1, 10, 0, 0, 0, tzinfo=timezone.utc)
    end_2 = datetime(2026, 1, 30, 0, 0, 0, tzinfo=timezone.utc)

    score, factors, has_critical = RuleEngine.evaluate(
        db=db_session,
        plant=plant,
        period_start=start_2,
        period_end=end_2,
        claimed_mwh=1200.0,
    )

    rule_ids = [f.rule_id for f in factors]
    assert "RULE-012" in rule_ids
    assert has_critical is True


def test_spatial_colocation_collusion_rule(db_session):
    """Verify RULE-014 triggers when another plant exists within 1.5 km with identical capacity."""
    solar_1 = db_session.query(Plant).first()
    user = db_session.query(User).first()

    # Create a colliding solar facility 0.4 km away with identical 50 MW capacity
    # ~0.0036 deg lat is approx 0.4 km
    colliding_solar = Plant(
        owner_id=user.id,
        name="Thar Solar Extension II",
        fuel_type=FuelType.SOLAR,
        nameplate_capacity_mw=50.0,
        grid_interconnection_id="GRID-THAR-COLLIDE",
        latitude=solar_1.latitude + 0.0036,
        longitude=solar_1.longitude,
        status=PlantStatus.ACTIVE,
    )
    db_session.add(colliding_solar)
    db_session.commit()

    start = datetime(2026, 2, 1, 0, 0, 0, tzinfo=timezone.utc)
    end = datetime(2026, 2, 28, 23, 59, 59, tzinfo=timezone.utc)

    score, factors, _ = RuleEngine.evaluate(
        db=db_session,
        plant=solar_1,
        period_start=start,
        period_end=end,
        claimed_mwh=1000.0,
    )

    rule_ids = [f.rule_id for f in factors]
    assert "RULE-014" in rule_ids
