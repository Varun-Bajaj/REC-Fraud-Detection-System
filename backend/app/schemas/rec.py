from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class RECCreateRequest(BaseModel):
    recId: str = Field(..., description="Unique REC identifier (e.g. REC-000001)")
    generatorId: str = Field(..., description="Generator facility ID (e.g. GEN-001)")
    energySource: str = Field(..., description="Energy source (SOLAR, WIND, HYDRO, BIOMASS)")
    generationDate: str = Field(..., description="Date of generation (YYYY-MM-DD)")
    generationMWh: float = Field(..., gt=0, description="Megawatt-hours generated")
    issuedQuantity: int = Field(..., gt=0, description="Number of certificate units issued")
    documentHash: str = Field(..., min_length=64, max_length=64, description="SHA-256 fingerprint of proof document")


class RECTransferRequest(BaseModel):
    fromOwner: str = Field(..., description="Current owner account")
    toOwner: str = Field(..., description="Recipient account")
    quantity: int = Field(..., gt=0, description="Number of units to transfer")
    transactionReference: Optional[str] = Field("", description="External trade reference or contract number")
    callerOrg: Optional[str] = Field("issuer", description="Fabric calling MSP org: issuer, buyer, or regulator")


class RECRetireRequest(BaseModel):
    owner: str = Field(..., description="Owner account holding the RECs")
    quantity: int = Field(..., gt=0, description="Number of units to retire")
    retirementReason: Optional[str] = Field("Scope 2 Carbon Offset", description="Purpose for retirement")
    callerOrg: Optional[str] = Field("buyer", description="Fabric calling MSP org: buyer or issuer")


class RECCancelRequest(BaseModel):
    reason: Optional[str] = Field("Regulatory Directive", description="Reason for cancellation")
    callerOrg: Optional[str] = Field("regulator", description="Fabric calling MSP org: regulator or issuer")


class RECAssetSchema(BaseModel):
    recId: str
    generatorId: str
    energySource: str
    generationDate: str
    generationMWh: float
    issuedQuantity: int
    currentOwner: str
    activeQuantity: int
    retiredQuantity: int
    status: str
    documentHash: str
    createdAt: str
    updatedAt: str
    balances: Dict[str, int] = {}


class RECHistoryItemSchema(BaseModel):
    txId: str
    timestamp: str
    isDelete: bool
    value: Optional[Dict[str, Any]] = None


class RECVerifyResponseSchema(BaseModel):
    valid: bool
    status: str
    message: str
    asset: Optional[Dict[str, Any]] = None


class DocumentUploadResponse(BaseModel):
    file_name: str
    document_hash: str
    file_size_bytes: int
    storage_path: str
    message: str


class DocumentVerifyResponse(BaseModel):
    match: bool
    status: str
    message: str
    computed_hash: str
    registered_hash: str
    disclaimer: str


class FraudAlertItem(BaseModel):
    alert_id: str
    rec_id: Optional[str] = None
    alert_type: str
    severity: str
    description: str
    detected_at: str
    evidence: Dict[str, Any] = {}
