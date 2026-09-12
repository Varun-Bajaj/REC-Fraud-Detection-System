import uuid
import pytest
from fastapi.testclient import TestClient

# Unique prefix to avoid collision across test runs
RUN_ID = uuid.uuid4().hex[:6].upper()


def test_01_create_rec(client: TestClient):
    """1. Create REC: Successfully issue a new REC on Hyperledger Fabric."""
    rec_id = f"REC-TEST-01-{RUN_ID}"
    doc_hash = "1111111111111111111111111111111111111111111111111111111111111111"
    payload = {
        "recId": rec_id,
        "generatorId": "GEN-SOLAR-01",
        "energySource": "SOLAR",
        "generationDate": "2026-09-01",
        "generationMWh": 100.0,
        "issuedQuantity": 100,
        "documentHash": doc_hash,
    }
    response = client.post("/api/rec", json=payload)
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["asset"]["recId"] == rec_id
    assert data["asset"]["activeQuantity"] == 100
    assert data["asset"]["status"] == "ACTIVE"


def test_02_duplicate_rec_creation(client: TestClient):
    """2. Duplicate REC creation: Attempting to create duplicate REC ID must be rejected."""
    rec_id = f"REC-TEST-02-{RUN_ID}"
    doc_hash = "2222222222222222222222222222222222222222222222222222222222222222"
    payload = {
        "recId": rec_id,
        "generatorId": "GEN-SOLAR-02",
        "energySource": "SOLAR",
        "generationDate": "2026-09-02",
        "generationMWh": 50.0,
        "issuedQuantity": 50,
        "documentHash": doc_hash,
    }
    # First creation succeeds
    res1 = client.post("/api/rec", json=payload)
    assert res1.status_code == 201

    # Second creation with same ID MUST fail
    res2 = client.post("/api/rec", json=payload)
    assert res2.status_code == 400
    assert "already exists" in res2.text.lower()


def test_03_invalid_rec_quantity(client: TestClient):
    """3. Invalid REC quantity: Zero or negative quantity must be rejected."""
    rec_id = f"REC-TEST-03-{RUN_ID}"
    doc_hash = "3333333333333333333333333333333333333333333333333333333333333333"
    payload = {
        "recId": rec_id,
        "generatorId": "GEN-SOLAR-03",
        "energySource": "SOLAR",
        "generationDate": "2026-09-03",
        "generationMWh": 0,
        "issuedQuantity": 0,  # Invalid zero quantity
        "documentHash": doc_hash,
    }
    response = client.post("/api/rec", json=payload)
    assert response.status_code in (400, 422)


def test_04_unauthorized_rec_creation(client: TestClient):
    """4. Unauthorized REC creation: BuyerOrg identity must be rejected from creating RECs."""
    rec_id = f"REC-TEST-04-{RUN_ID}"
    doc_hash = "4444444444444444444444444444444444444444444444444444444444444444"
    from app.config import settings
    import httpx
    payload = {
        "recId": rec_id,
        "generatorId": "GEN-SOLAR-04",
        "energySource": "SOLAR",
        "generationDate": "2026-09-04",
        "generationMWh": 100,
        "issuedQuantity": 100,
        "documentHash": doc_hash,
        "callerOrg": "buyer",  # Buyer is NOT authorized to issue
    }
    with httpx.Client(timeout=10.0) as http:
        res = http.post(f"{settings.FABRIC_GATEWAY_URL}/api/fabric/create-rec", json=payload)
        assert res.status_code != 200
        assert any(k in res.text for k in ["IssuerOrg", "ABORTED", "UNAUTHORIZED", "not authorized"])


def test_05_valid_transfer(client: TestClient):
    """5. Valid transfer: Transfer active quantity to corporate buyer."""
    rec_id = f"REC-TEST-05-{RUN_ID}"
    doc_hash = "5555555555555555555555555555555555555555555555555555555555555555"
    client.post("/api/rec", json={
        "recId": rec_id,
        "generatorId": "GEN-05",
        "energySource": "WIND",
        "generationDate": "2026-09-05",
        "generationMWh": 100,
        "issuedQuantity": 100,
        "documentHash": doc_hash,
    })

    transfer_payload = {
        "fromOwner": "ISSUER-ORG",
        "toOwner": "CORP-BUYER-B",
        "quantity": 35,
        "transactionReference": "TX-REF-05",
        "callerOrg": "issuer",
    }
    res = client.post(f"/api/rec/{rec_id}/transfer", json=transfer_payload)
    assert res.status_code == 200, res.text
    asset = res.json()["asset"]
    assert asset["balances"]["CORP-BUYER-B"] == 35
    assert asset["balances"]["ISSUER-ORG"] == 65


def test_06_transfer_greater_than_balance(client: TestClient):
    """6. Transfer greater than balance: Reject transaction exceeding available quantity."""
    rec_id = f"REC-TEST-06-{RUN_ID}"
    doc_hash = "6666666666666666666666666666666666666666666666666666666666666666"
    client.post("/api/rec", json={
        "recId": rec_id,
        "generatorId": "GEN-06",
        "energySource": "HYDRO",
        "generationDate": "2026-09-06",
        "generationMWh": 50,
        "issuedQuantity": 50,
        "documentHash": doc_hash,
    })

    # Attempt to transfer 100 when only 50 exists
    res = client.post(f"/api/rec/{rec_id}/transfer", json={
        "fromOwner": "ISSUER-ORG",
        "toOwner": "BUYER-X",
        "quantity": 100,
        "callerOrg": "issuer",
    })
    assert res.status_code == 400
    assert any(k in res.text.lower() for k in ["insufficient", "balance", "aborted", "failed to endorse"])


def test_07_unauthorized_transfer(client: TestClient):
    """7. Unauthorized transfer: Non-owner cannot transfer someone else's RECs."""
    rec_id = f"REC-TEST-07-{RUN_ID}"
    doc_hash = "7777777777777777777777777777777777777777777777777777777777777777"
    client.post("/api/rec", json={
        "recId": rec_id,
        "generatorId": "GEN-07",
        "energySource": "SOLAR",
        "generationDate": "2026-09-07",
        "generationMWh": 100,
        "issuedQuantity": 100,
        "documentHash": doc_hash,
    })

    # Attempt to transfer from an account that does not own any units
    res = client.post(f"/api/rec/{rec_id}/transfer", json={
        "fromOwner": "IMPOSTER-ACCOUNT",
        "toOwner": "BUYER-Y",
        "quantity": 20,
        "callerOrg": "buyer",
    })
    assert res.status_code == 400


def test_08_valid_retirement(client: TestClient):
    """8. Valid retirement: Owner successfully retires active certificates."""
    rec_id = f"REC-TEST-08-{RUN_ID}"
    doc_hash = "8888888888888888888888888888888888888888888888888888888888888888"
    client.post("/api/rec", json={
        "recId": rec_id,
        "generatorId": "GEN-08",
        "energySource": "SOLAR",
        "generationDate": "2026-09-08",
        "generationMWh": 100,
        "issuedQuantity": 100,
        "documentHash": doc_hash,
    })
    # Transfer 40 to BUYER-8
    client.post(f"/api/rec/{rec_id}/transfer", json={
        "fromOwner": "ISSUER-ORG",
        "toOwner": "BUYER-8",
        "quantity": 40,
        "callerOrg": "issuer",
    })

    # BUYER-8 retires 25 units
    res = client.post(f"/api/rec/{rec_id}/retire", json={
        "owner": "BUYER-8",
        "quantity": 25,
        "retirementReason": "Scope 2 ESG Audit Compliance",
        "callerOrg": "buyer",
    })
    assert res.status_code == 200, res.text
    asset = res.json()["asset"]
    assert asset["retiredQuantity"] == 25
    assert asset["activeQuantity"] == 75
    assert asset["balances"]["BUYER-8"] == 15


def test_09_retirement_greater_than_balance(client: TestClient):
    """9. Retirement greater than balance: Reject retirement exceeding owner balance."""
    rec_id = f"REC-TEST-09-{RUN_ID}"
    doc_hash = "9999999999999999999999999999999999999999999999999999999999999999"
    client.post("/api/rec", json={
        "recId": rec_id,
        "generatorId": "GEN-09",
        "energySource": "SOLAR",
        "generationDate": "2026-09-09",
        "generationMWh": 30,
        "issuedQuantity": 30,
        "documentHash": doc_hash,
    })

    # Attempt to retire 50 units when only 30 available
    res = client.post(f"/api/rec/{rec_id}/retire", json={
        "owner": "ISSUER-ORG",
        "quantity": 50,
        "callerOrg": "issuer",
    })
    assert res.status_code == 400
    assert any(k in res.text.lower() for k in ["insufficient", "balance", "aborted", "failed to endorse"])


def test_10_transfer_retired_rec(client: TestClient):
    """10. Transfer retired REC: Attempt to transfer from retired units must be rejected."""
    rec_id = f"REC-TEST-10-{RUN_ID}"
    doc_hash = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    client.post("/api/rec", json={
        "recId": rec_id,
        "generatorId": "GEN-10",
        "energySource": "SOLAR",
        "generationDate": "2026-09-10",
        "generationMWh": 20,
        "issuedQuantity": 20,
        "documentHash": doc_hash,
    })
    # Fully retire all 20 units
    client.post(f"/api/rec/{rec_id}/retire", json={
        "owner": "ISSUER-ORG",
        "quantity": 20,
        "callerOrg": "issuer",
    })

    # Attempt to transfer now that active balance is 0
    res = client.post(f"/api/rec/{rec_id}/transfer", json={
        "fromOwner": "ISSUER-ORG",
        "toOwner": "SOME-BUYER",
        "quantity": 10,
        "callerOrg": "issuer",
    })
    assert res.status_code == 400


def test_11_cancel_rec(client: TestClient):
    """11. Cancel REC: Authorized Regulator cancels a certificate."""
    rec_id = f"REC-TEST-11-{RUN_ID}"
    doc_hash = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    client.post("/api/rec", json={
        "recId": rec_id,
        "generatorId": "GEN-11",
        "energySource": "BIOMASS",
        "generationDate": "2026-09-11",
        "generationMWh": 80,
        "issuedQuantity": 80,
        "documentHash": doc_hash,
    })

    # Regulator cancels the REC
    res = client.post(f"/api/rec/{rec_id}/cancel", json={
        "reason": "Auditor identified fraudulent meter documentation",
        "callerOrg": "regulator",
    })
    assert res.status_code == 200, res.text
    asset = res.json()["asset"]
    assert asset["status"] == "CANCELLED"


def test_12_transfer_cancelled_rec(client: TestClient):
    """12. Transfer cancelled REC: Smart contract MUST reject transfer of cancelled REC."""
    rec_id = f"REC-TEST-12-{RUN_ID}"
    doc_hash = "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
    client.post("/api/rec", json={
        "recId": rec_id,
        "generatorId": "GEN-12",
        "energySource": "SOLAR",
        "generationDate": "2026-09-12",
        "generationMWh": 60,
        "issuedQuantity": 60,
        "documentHash": doc_hash,
    })
    # Cancel it
    client.post(f"/api/rec/{rec_id}/cancel", json={
        "reason": "Revocation order",
        "callerOrg": "regulator",
    })

    # Attempt transfer of cancelled certificate
    res = client.post(f"/api/rec/{rec_id}/transfer", json={
        "fromOwner": "ISSUER-ORG",
        "toOwner": "BUYER-Z",
        "quantity": 10,
        "callerOrg": "issuer",
    })
    assert res.status_code == 400
    assert any(k in res.text.lower() for k in ["cancelled", "aborted", "failed to endorse"])


def test_13_duplicate_document_hash(client: TestClient):
    """13. Duplicate document hash: Fraud engine detects double counting and flags CRITICAL."""
    shared_hash = "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"
    rec_1 = f"REC-DOC-1-{RUN_ID}"
    rec_2 = f"REC-DOC-2-{RUN_ID}"

    # First REC with this hash
    res1 = client.post("/api/rec", json={
        "recId": rec_1,
        "generatorId": "GEN-SOLAR-A",
        "energySource": "SOLAR",
        "generationDate": "2026-09-01",
        "generationMWh": 100,
        "issuedQuantity": 100,
        "documentHash": shared_hash,
    })
    assert res1.status_code == 201

    # Second REC reusing the EXACT SAME document hash
    res2 = client.post("/api/rec", json={
        "recId": rec_2,
        "generatorId": "GEN-SOLAR-B",
        "energySource": "SOLAR",
        "generationDate": "2026-09-02",
        "generationMWh": 100,
        "issuedQuantity": 100,
        "documentHash": shared_hash,
    })
    assert res2.status_code == 201
    fraud_eval = res2.json()["fraudEvaluation"]
    assert fraud_eval["riskLevel"] in ("HIGH", "CRITICAL")
    assert any("duplicate document hash" in r.lower() for r in fraud_eval["reasons"])


def test_14_rec_history(client: TestClient):
    """14. REC history: Ledger returns full chronological transaction block history."""
    rec_id = f"REC-TEST-14-{RUN_ID}"
    doc_hash = "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
    # Create
    client.post("/api/rec", json={
        "recId": rec_id,
        "generatorId": "GEN-14",
        "energySource": "SOLAR",
        "generationDate": "2026-09-14",
        "generationMWh": 100,
        "issuedQuantity": 100,
        "documentHash": doc_hash,
    })
    # Transfer
    client.post(f"/api/rec/{rec_id}/transfer", json={
        "fromOwner": "ISSUER-ORG",
        "toOwner": "BUYER-14",
        "quantity": 50,
        "callerOrg": "issuer",
    })
    # Retire
    client.post(f"/api/rec/{rec_id}/retire", json={
        "owner": "BUYER-14",
        "quantity": 25,
        "callerOrg": "buyer",
    })

    # Query history
    res = client.get(f"/api/rec/{rec_id}/history")
    assert res.status_code == 200, res.text
    history = res.json()["history"]
    assert len(history) >= 3
    assert all("txId" in item and "timestamp" in item for item in history)


def test_15_authorization_by_organization(client: TestClient):
    """15. Authorization by organization: Auditor identity can query but cannot mutate state."""
    from app.config import settings
    import httpx

    rec_id = f"REC-TEST-15-{RUN_ID}"
    doc_hash = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"

    # Issuer creates REC
    client.post("/api/rec", json={
        "recId": rec_id,
        "generatorId": "GEN-15",
        "energySource": "SOLAR",
        "generationDate": "2026-09-15",
        "generationMWh": 100,
        "issuedQuantity": 100,
        "documentHash": doc_hash,
    })

    # Auditor queries REC (Allowed)
    with httpx.Client(timeout=10.0) as http:
        query_res = http.get(f"{settings.FABRIC_GATEWAY_URL}/api/fabric/rec/{rec_id}")
        assert query_res.status_code == 200

        # Auditor attempts to mutate / cancel REC (Forbidden)
        cancel_res = http.post(f"{settings.FABRIC_GATEWAY_URL}/api/fabric/cancel-rec", json={
            "recId": rec_id,
            "reason": "Auditor unauthorized cancel attempt",
            "callerOrg": "auditor",
        })
        assert cancel_res.status_code != 200
        assert "UNAUTHORIZED" in cancel_res.text or "RegulatorOrg" in cancel_res.text or "ABORTED" in cancel_res.text


def test_16_ledger_query_and_verify(client: TestClient):
    """16. Ledger query and verify: Cryptographically verify asset on-chain."""
    rec_id = f"REC-TEST-16-{RUN_ID}"
    doc_hash = "1010101010101010101010101010101010101010101010101010101010101010"
    client.post("/api/rec", json={
        "recId": rec_id,
        "generatorId": "GEN-16",
        "energySource": "WIND",
        "generationDate": "2026-09-16",
        "generationMWh": 50,
        "issuedQuantity": 50,
        "documentHash": doc_hash,
    })

    # Query get_rec
    get_res = client.get(f"/api/rec/{rec_id}")
    assert get_res.status_code == 200
    assert get_res.json()["asset"]["recId"] == rec_id

    # Verify REC on-chain
    verify_res = client.get(f"/api/rec/{rec_id}/verify")
    assert verify_res.status_code == 200
    verification = verify_res.json()["onchainVerification"]
    assert verification["valid"] is True
    assert verification["status"] == "ACTIVE"
