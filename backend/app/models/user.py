import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship

from app.core.database import Base


class UserRole(str, enum.Enum):
    GENERATOR = "GENERATOR"
    REGULATOR = "REGULATOR"
    AUDITOR = "AUDITOR"
    ADMIN = "ADMIN"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    organization_name = Column(String(255), nullable=True)
    role = Column(Enum(UserRole), default=UserRole.GENERATOR, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    plants = relationship("Plant", back_populates="owner", cascade="all, delete-orphan")
    claims_submitted = relationship("CertificateClaim", back_populates="submitted_by")
    certificates_owned = relationship("Certificate", back_populates="current_owner", foreign_keys="Certificate.current_owner_id")
    assigned_cases = relationship("InvestigationCase", back_populates="assigned_investigator")
