import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Enum, JSON

from app.core.database import Base


class LedgerEventType(str, enum.Enum):
    GENESIS = "GENESIS"
    CLAIM_SUBMITTED = "CLAIM_SUBMITTED"
    CLAIM_EVALUATED = "CLAIM_EVALUATED"
    CERTIFICATE_ISSUED = "CERTIFICATE_ISSUED"
    CERTIFICATE_TRANSFERRED = "CERTIFICATE_TRANSFERRED"
    CERTIFICATE_REDEEMED = "CERTIFICATE_REDEEMED"
    INVESTIGATION_OPENED = "INVESTIGATION_OPENED"
    INVESTIGATION_RESOLVED = "INVESTIGATION_RESOLVED"


class LedgerBlock(Base):
    __tablename__ = "ledger_blocks"

    id = Column(Integer, primary_key=True, index=True)
    index = Column(Integer, unique=True, index=True, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    event_type = Column(Enum(LedgerEventType), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False)  # e.g., "CLAIM", "CERTIFICATE", "INVESTIGATION"
    entity_id = Column(String(100), nullable=False, index=True)
    data_payload = Column(JSON, nullable=False)
    data_hash = Column(String(64), nullable=False)  # SHA-256 of data_payload
    previous_hash = Column(String(64), nullable=False)
    current_hash = Column(String(64), unique=True, index=True, nullable=False)
