from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.certificate import CertificateStatus, TransferType
from app.models.plant import FuelType


class CertificateResponse(BaseModel):
    id: int
    certificate_uid: str
    claim_id: int
    plant_id: int
    current_owner_id: int
    fuel_type: FuelType
    mwh: float
    vintage_year: int
    vintage_month: int
    issuance_date: datetime
    status: CertificateStatus

    model_config = ConfigDict(from_attributes=True)


class CertificateTransferCreate(BaseModel):
    to_user_id: int = Field(..., gt=0)
    notes: Optional[str] = None


class CertificateTransferResponse(BaseModel):
    id: int
    certificate_id: int
    from_user_id: Optional[int] = None
    to_user_id: int
    transfer_type: TransferType
    timestamp: datetime
    tx_hash: str

    model_config = ConfigDict(from_attributes=True)


class CertificateProvenanceResponse(BaseModel):
    certificate: CertificateResponse
    lifecycle_transfers: List[CertificateTransferResponse]
