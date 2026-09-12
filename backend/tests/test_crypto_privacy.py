import pytest
from app.services.crypto_privacy import CryptoPrivacyService


def test_pedersen_commitment_generation_and_opening():
    """Verify Pedersen commitment can be created and accurately opened with secret blinding factor."""
    val = 1542.50
    comm = CryptoPrivacyService.generate_pedersen_commitment(val)

    assert comm["commitment_hex"].startswith("0x")
    assert comm["blinding_factor_hex"].startswith("0x")

    # Valid opening
    is_valid = CryptoPrivacyService.verify_pedersen_opening(
        commitment_hex=comm["commitment_hex"],
        value=val,
        blinding_factor_hex=comm["blinding_factor_hex"],
    )
    assert is_valid is True

    # Tampered value fails opening
    is_fake_valid = CryptoPrivacyService.verify_pedersen_opening(
        commitment_hex=comm["commitment_hex"],
        value=val + 100.0,
        blinding_factor_hex=comm["blinding_factor_hex"],
    )
    assert is_fake_valid is False


def test_pedersen_homomorphic_addition():
    """Verify homomorphic property: C(m1, r1) * C(m2, r2) mod p == C(m1 + m2, r1 + r2) mod p."""
    m1 = 500.0
    m2 = 750.0
    c1 = CryptoPrivacyService.generate_pedersen_commitment(m1)
    c2 = CryptoPrivacyService.generate_pedersen_commitment(m2)

    # Multiply commitments modulo P
    p = CryptoPrivacyService.P
    c1_int = int(c1["commitment_hex"], 16)
    c2_int = int(c2["commitment_hex"], 16)
    c_sum = (c1_int * c2_int) % p

    # Sum blinding factors
    r1_int = int(c1["blinding_factor_hex"], 16)
    r2_int = int(c2["blinding_factor_hex"], 16)
    r_sum = r1_int + r2_int

    # Verify c_sum opens to m1 + m2 (1250.0)
    is_homomorphic_valid = CryptoPrivacyService.verify_pedersen_opening(
        commitment_hex=hex(c_sum),
        value=1250.0,
        blinding_factor_hex=hex(r_sum),
    )
    assert is_homomorphic_valid is True


def test_nizk_bounds_proof_valid():
    """Verify Non-Interactive Zero-Knowledge Proof passes when within tolerance without leaking values."""
    claimed_mwh = 1000.0
    metered_mwh = 1010.0  # ~0.99% discrepancy, within 2% tolerance

    proof = CryptoPrivacyService.generate_confidential_bounds_proof(
        claimed_mwh=claimed_mwh,
        metered_mwh=metered_mwh,
        tolerance_pct=2.0,
    )
    assert proof["is_valid_proof"] is True
    assert "claim_commitment" in proof
    assert "meter_commitment" in proof
    assert "fiat_shamir_challenge" in proof


def test_nizk_bounds_proof_out_of_bounds():
    """Verify NIZK Proof flags out-of-bounds discrepancy."""
    claimed_mwh = 1500.0
    metered_mwh = 1000.0  # 50% discrepancy, far exceeds 2% tolerance

    proof = CryptoPrivacyService.generate_confidential_bounds_proof(
        claimed_mwh=claimed_mwh,
        metered_mwh=metered_mwh,
        tolerance_pct=2.0,
    )
    assert proof["is_valid_proof"] is False


def test_smart_meter_did_verification():
    """Verify Smart Meter DID hardware enclave attestation."""
    meter_did = "did:rec:meter:US-CA-0091"
    telemetry = {"meter_id": "SM-01", "interval_kwh": 450.5, "voltage": 240}
    enclave_sig = "0x_TPM20_99A8F31D"

    attestation = CryptoPrivacyService.verify_smart_meter_did(
        meter_did=meter_did,
        payload=telemetry,
        signature_hex=enclave_sig,
    )
    assert attestation["signature_authentic"] is True
    assert attestation["attestation_status"] == "SECURE_HARDWARE_VERIFIED"
