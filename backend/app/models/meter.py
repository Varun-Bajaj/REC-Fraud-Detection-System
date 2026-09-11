from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base


class MeterReading(Base):
    __tablename__ = "meter_readings"

    id = Column(Integer, primary_key=True, index=True)
    plant_id = Column(Integer, ForeignKey("plants.id"), nullable=False)
    meter_serial_number = Column(String(100), index=True, nullable=False)
    interval_start = Column(DateTime, nullable=False, index=True)
    interval_end = Column(DateTime, nullable=False, index=True)
    energy_generated_mwh = Column(Float, nullable=False)
    raw_meter_hash = Column(String(64), nullable=True)  # SHA-256 of raw meter payload
    telemetry_source = Column(String(100), default="UTILITY_SMART_METER", nullable=False)
    recorded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    plant = relationship("Plant", back_populates="meter_readings")
    claims = relationship("CertificateClaim", back_populates="meter_reading")
