from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_user
from app.models.user import User
from app.services.crypto_privacy import CryptoPrivacyService

router = APIRouter(prefix="/privacy", tags=["Data Protection & Cryptographic Privacy"])


class PedersenCommitRequest(BaseModel):
    value: float = Field(..., description="Numerical value to commit (e.g. MWh or Tariff)", ge=0.0)


class PedersenVerifyRequest(BaseModel):
    commitment_hex: str = Field(..., description="Pedersen commitment hex string")
    value: float = Field(..., description="Value to open")
    blinding_factor_hex: str = Field(..., description="Secret blinding factor used in commitment")


class NIZKBoundsProofRequest(BaseModel):
    claimed_mwh: float = Field(..., description="Claimed generation in MWh", ge=0.0)
    metered_mwh: float = Field(..., description="Confidential meter reading in MWh", ge=0.0)
    tolerance_percentage: float = Field(2.0, description="Allowed discrepancy percentage", ge=0.0, le=10.0)


class MeterDidVerifyRequest(BaseModel):
    meter_did: str = Field(..., description="Smart Meter DID (e.g. did:rec:meter:US-CA-MTR-001)")
    payload: Dict[str, Any] = Field(..., description="Raw meter interval reading payload")
    signature_hex: str = Field(..., description="Hardware enclave signature")


@router.post("/pedersen-commit")
def create_pedersen_commitment(
    body: PedersenCommitRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Creates a homomorphic Pedersen commitment over generation MWh.
    Allows mathematically binding to a volume while hiding it from competitors.
    """
    return CryptoPrivacyService.generate_pedersen_commitment(value=body.value)


@router.post("/verify-pedersen")
def verify_pedersen_commitment(
    body: PedersenVerifyRequest,
    current_user: User = Depends(get_current_user),
):
    """Verifies that a Pedersen commitment opens to the claimed numerical value."""
    is_valid = CryptoPrivacyService.verify_pedersen_opening(
        commitment_hex=body.commitment_hex,
        value=body.value,
        blinding_factor_hex=body.blinding_factor_hex,
    )
    return {
        "is_valid": is_valid,
        "verified_by": "Pedersen-MODP-2048-Group-Verifier",
        "message": "Commitment opening verified successfully." if is_valid else "Invalid commitment opening.",
    }


@router.post("/nizk-bounds-proof")
def generate_confidential_bounds_proof(
    body: NIZKBoundsProofRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Generates a Non-Interactive Zero-Knowledge (NIZK) Proof of Generation Bounds.
    Proves to the Regulator/Auditor that Claimed MWh matches Metered MWh within tolerance
    WITHOUT disclosing proprietary corporate factory loads or bilateral PPA pricing.
    """
    return CryptoPrivacyService.generate_confidential_bounds_proof(
        claimed_mwh=body.claimed_mwh,
        metered_mwh=body.metered_mwh,
        tolerance_pct=body.tolerance_percentage,
    )


@router.post("/verify-meter-did")
def verify_smart_meter_did_signature(
    body: MeterDidVerifyRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Verifies hardware-anchored Smart Meter Decentralized Identifier (DID) and enclave signature.
    Prevents database-level middleman telemetry tampering.
    """
    return CryptoPrivacyService.verify_smart_meter_did(
        meter_did=body.meter_did,
        payload=body.payload,
        signature_hex=body.signature_hex,
    )
