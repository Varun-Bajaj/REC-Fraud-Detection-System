from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Text
from app.core.database import Base


class FabricRECRecord(Base):
    __tablename__ = "fabric_rec_records"

    id = Column(Integer, primary_key=True, index=True)
    rec_id = Column(String(100), unique=True, index=True, nullable=False)
    generator_id = Column(String(100), index=True, nullable=False)
    energy_source = Column(String(50), nullable=False)
    generation_date = Column(String(20), nullable=False)
    generation_mwh = Column(Float, nullable=False)
    issued_quantity = Column(Integer, nullable=False)
    document_hash = Column(String(64), index=True, nullable=False)
    document_filename = Column(String(255), nullable=True)
    storage_path = Column(String(500), nullable=True)

    # Fraud & Risk evaluation cached off-chain
    fraud_risk_score = Column(Float, default=0.0, nullable=False)
    fraud_risk_level = Column(String(20), default="LOW", nullable=False)
    fraud_reasons = Column(JSON, default=list, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class FabricFraudAlert(Base):
    __tablename__ = "fabric_fraud_alerts"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String(100), unique=True, index=True, nullable=False)
    rec_id = Column(String(100), index=True, nullable=True)
    alert_type = Column(String(100), nullable=False)
    severity = Column(String(20), default="HIGH", nullable=False)
    description = Column(Text, nullable=False)
    evidence = Column(JSON, default=dict, nullable=False)
    detected_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
