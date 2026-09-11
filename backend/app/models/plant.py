import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base


class FuelType(str, enum.Enum):
    SOLAR = "SOLAR"
    WIND = "WIND"
    HYDRO = "HYDRO"
    BIOMASS = "BIOMASS"
    GEOTHERMAL = "GEOTHERMAL"


class PlantStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    DECOMMISSIONED = "DECOMMISSIONED"


class Plant(Base):
    __tablename__ = "plants"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False, index=True)
    fuel_type = Column(Enum(FuelType), nullable=False)
    nameplate_capacity_mw = Column(Float, nullable=False)
    grid_interconnection_id = Column(String(100), unique=True, index=True, nullable=False)
    location_address = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    commissioning_date = Column(DateTime, nullable=True)
    max_capacity_factor = Column(Float, default=0.50, nullable=False)  # Theoretical upper bound for this plant
    status = Column(Enum(PlantStatus), default=PlantStatus.ACTIVE, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    owner = relationship("User", back_populates="plants")
    meter_readings = relationship("MeterReading", back_populates="plant", cascade="all, delete-orphan")
    claims = relationship("CertificateClaim", back_populates="plant")
    certificates = relationship("Certificate", back_populates="plant")
