import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base


class ClaimStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    UNDER_REVIEW = "UNDER_REVIEW"
    HELD = "HELD"
    REJECTED = "REJECTED"


class RiskLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class DocumentType(str, enum.Enum):
    METER_REPORT = "METER_REPORT"
    GRID_SETTLEMENT = "GRID_SETTLEMENT"
    SINGLE_LINE_DIAGRAM = "SINGLE_LINE_DIAGRAM"
    INVERTER_LOG = "INVERTER_LOG"
    OTHER = "OTHER"


class CertificateClaim(Base):
    __tablename__ = "certificate_claims"

    id = Column(Integer, primary_key=True, index=True)
    claim_uid = Column(String(50), unique=True, index=True, nullable=False)
    plant_id = Column(Integer, ForeignKey("plants.id"), nullable=False)
    submitted_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    period_start = Column(DateTime, nullable=False, index=True)
    period_end = Column(DateTime, nullable=False, index=True)
    claimed_mwh = Column(Float, nullable=False)
    meter_reading_id = Column(Integer, ForeignKey("meter_readings.id"), nullable=True)
    submission_fingerprint = Column(String(64), index=True, nullable=False)  # SHA-256 for instant duplicate catch

    # Forensic & Risk evaluation attributes
    status = Column(Enum(ClaimStatus), default=ClaimStatus.PENDING, nullable=False, index=True)
    risk_score = Column(Float, default=0.0, nullable=False)  # 0.0 to 100.0
    risk_level = Column(Enum(RiskLevel), default=RiskLevel.LOW, nullable=False)
    risk_breakdown = Column(JSON, nullable=True)  # Structured explanation and engine scores

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    plant = relationship("Plant", back_populates="claims")
    submitted_by = relationship("User", back_populates="claims_submitted")
    meter_reading = relationship("MeterReading", back_populates="claims")
    documents = relationship("DocumentEvidence", back_populates="claim", cascade="all, delete-orphan")
    certificate = relationship("Certificate", back_populates="claim", uselist=False)
    investigation_cases = relationship("InvestigationCase", back_populates="claim")


class DocumentEvidence(Base):
    __tablename__ = "document_evidence"

    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(Integer, ForeignKey("certificate_claims.id"), nullable=False)
    document_type = Column(Enum(DocumentType), default=DocumentType.METER_REPORT, nullable=False)
    file_name = Column(String(255), nullable=False)
    file_hash = Column(String(64), index=True, nullable=False)  # SHA-256 hash of file content
    file_size_bytes = Column(Integer, nullable=False)
    storage_path = Column(String(500), nullable=True)
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    claim = relationship("CertificateClaim", back_populates="documents")
