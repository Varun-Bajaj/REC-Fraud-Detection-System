from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict
from app.models.ledger import LedgerEventType


class LedgerBlockResponse(BaseModel):
    id: int
    index: int
    timestamp: datetime
    event_type: LedgerEventType
    entity_type: str
    entity_id: str
    data_payload: Dict[str, Any]
    data_hash: str
    previous_hash: str
    current_hash: str

    model_config = ConfigDict(from_attributes=True)


class LedgerVerifyResponse(BaseModel):
    is_valid: bool
    total_blocks: int
    tampered_block_index: Optional[int] = None
    verification_message: str
    verified_at: datetime


class DocumentVerifyResponse(BaseModel):
    file_name: str
    computed_sha256: str
    is_registered: bool
    first_seen_claim_uid: Optional[str] = None
    first_seen_timestamp: Optional[datetime] = None
    tamper_detected: bool
    verification_status: str
