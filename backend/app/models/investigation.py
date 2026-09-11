import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.claim import RiskLevel

# Alias for priority
PriorityLevel = RiskLevel


class CaseStatus(str, enum.Enum):
    OPEN = "OPEN"
    UNDER_INVESTIGATION = "UNDER_INVESTIGATION"
    RESOLVED_FRAUD = "RESOLVED_FRAUD"
    RESOLVED_LEGITIMATE = "RESOLVED_LEGITIMATE"
    CLOSED = "CLOSED"


class DecisionAction(str, enum.Enum):
    PENDING = "PENDING"
    CONFIRM_FRAUD_HOLD = "CONFIRM_FRAUD_HOLD"
    CLEAR_AND_ISSUE = "CLEAR_AND_ISSUE"


class InvestigationCase(Base):
    __tablename__ = "investigation_cases"

    id = Column(Integer, primary_key=True, index=True)
    case_number = Column(String(50), unique=True, index=True, nullable=False)
    claim_id = Column(Integer, ForeignKey("certificate_claims.id"), nullable=False)
    assigned_investigator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(Enum(CaseStatus), default=CaseStatus.OPEN, nullable=False, index=True)
    priority = Column(Enum(RiskLevel), default=RiskLevel.HIGH, nullable=False)
    findings = Column(Text, nullable=True)
    decision_action = Column(Enum(DecisionAction), default=DecisionAction.PENDING, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    claim = relationship("CertificateClaim", back_populates="investigation_cases")
    assigned_investigator = relationship("User", back_populates="assigned_cases")
