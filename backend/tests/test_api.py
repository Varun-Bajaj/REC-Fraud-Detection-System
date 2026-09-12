import io
import hashlib
from datetime import datetime, timedelta, timezone


def get_token(client, email="admin@recguardian.org", password="password123"):
    res = client.post("/api/v1/auth/login", data={"username": email, "password": password})
    return res.json()["access_token"]


def test_health_check(client):
    """Test health probe endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_auth_login(client):
    """Test login with seeded admin credentials."""
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "admin@recguardian.org", "password": "password123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "admin@recguardian.org"
    assert data["user"]["role"] == "ADMIN"


def test_auth_login_json_and_roles(client):
    """Test login-json for both Generator and Regulator personas."""
    # 1. Generator login
    res_gen = client.post(
        "/api/v1/auth/login-json",
        json={"email": "generator@solarfarm.com", "password": "password123"},
    )
    assert res_gen.status_code == 200
    gen_data = res_gen.json()
    assert gen_data["user"]["role"] == "GENERATOR"
    assert "access_token" in gen_data
    gen_token = gen_data["access_token"]

    # 2. Regulator login
    res_reg = client.post(
        "/api/v1/auth/login-json",
        json={"email": "regulator@recguardian.org", "password": "password123"},
    )
    assert res_reg.status_code == 200
    reg_data = res_reg.json()
    assert reg_data["user"]["role"] == "REGULATOR"
    assert "access_token" in reg_data

    # 3. Generator scoped dashboard
    res_dash = client.get(
        "/api/v1/analytics/dashboard",
        headers={"Authorization": f"Bearer {gen_token}"},
    )
    assert res_dash.status_code == 200
    dash_data = res_dash.json()
    assert dash_data["total_plants"] == 2  # Generator only sees their 2 plants

    # 4. RBAC: Generator cannot adjudicate
    res_adj = client.post(
        "/api/v1/investigations/1/decision",
        json={"decision_action": "CONFIRM_FRAUD_HOLD", "findings": "Unauthorized test"},
        headers={"Authorization": f"Bearer {gen_token}"},
    )
    assert res_adj.status_code == 403


def test_auth_registration(client):
    """Test self-registration for clean energy producers."""
    unique_email = "new_clean_producer@solarfarm.org"
    res = client.post(
        "/api/v1/auth/register",
        json={
            "email": unique_email,
            "password": "SecurePassword123!",
            "full_name": "Dr. Sarah Lin",
            "organization_name": "Pacific Clean Energy",
            "role": "GENERATOR",
        },
    )
    assert res.status_code == 201
    user_info = res.json()
    assert user_info["email"] == unique_email
    assert user_info["role"] == "GENERATOR"

    # Verify logging into newly registered account
    login_res = client.post(
        "/api/v1/auth/login-json",
        json={"email": unique_email, "password": "SecurePassword123!"},
    )
    assert login_res.status_code == 200
    assert login_res.json()["user"]["email"] == unique_email


def test_list_plants(client):
    """Test fetching registered plants."""
    token = get_token(client, "regulator@recguardian.org")
    response = client.get(
        "/api/v1/plants/",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    plants = response.json()
    assert len(plants) >= 3
    plant_names = [p["name"] for p in plants]
    assert "Mojave Desert Solar One" in plant_names


def test_dashboard_kpis(client):
    """Test dashboard analytics metrics."""
    token = get_token(client, "auditor@recguardian.org")
    response = client.get(
        "/api/v1/analytics/dashboard",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    stats = response.json()
    assert stats["total_plants"] >= 3
    assert stats["total_claims"] >= 4
    assert stats["claims_held"] >= 2
    assert "CRITICAL" in stats["risk_distribution"]


def test_network_graph_api(client):
    """Test network graph transfer topology endpoint."""
    token = get_token(client, "auditor@recguardian.org")
    response = client.get(
        "/api/v1/analytics/network-graph",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    graph = response.json()
    assert len(graph["nodes"]) >= 4
    assert len(graph["edges"]) >= 3
    assert len(graph["detected_cycles"]) > 0


def test_ledger_audit_api(client):
    """Test cryptographic ledger verification API."""
    token = get_token(client, "auditor@recguardian.org")
    response = client.get(
        "/api/v1/ledger/verify",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    audit = response.json()
    assert audit["is_valid"] is True
    assert audit["total_blocks"] > 0
    assert audit["tampered_block_index"] is None


def test_claim_submission_and_evaluation(client):
    """Test submitting a legitimate claim and verifying auto-approval and explainable risk breakdown."""
    token = get_token(client, "generator@solarfarm.com")

    # Fetch generator's plant
    plants_res = client.get("/api/v1/plants/", headers={"Authorization": f"Bearer {token}"})
    plant_id = plants_res.json()[0]["id"]

    now = datetime.now(timezone.utc)
    start = now - timedelta(days=15)
    end = now - timedelta(days=1)

    claim_payload = {
        "plant_id": plant_id,
        "period_start": start.isoformat(),
        "period_end": end.isoformat(),
        "claimed_mwh": 1200.0,
        "document_hashes": [
            {
                "document_type": "METER_REPORT",
                "file_name": "solar_inverter_certified_report.pdf",
                "file_hash": hashlib.sha256(b"unique_certified_doc_content_001").hexdigest(),
                "file_size_bytes": 102400,
            }
        ],
    }

    res = client.post("/api/v1/claims/", json=claim_payload, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 201
    claim_data = res.json()
    assert "claim_uid" in claim_data
    assert claim_data["status"] in ["APPROVED", "UNDER_REVIEW", "HELD"]
    assert claim_data["risk_breakdown"] is not None
    assert "factors" in claim_data["risk_breakdown"]


def test_certificate_lifecycle(client):
    """Test certificate listing, transfer, and redemption."""
    admin_token = get_token(client, "admin@recguardian.org")
    certs_res = client.get("/api/v1/certificates/", headers={"Authorization": f"Bearer {admin_token}"})
    assert certs_res.status_code == 200
    certs = certs_res.json()
    assert len(certs) > 0

    # Pick an available unredeemed certificate or create one
    unredeemed = [c for c in certs if c["status"] != "REDEEMED"]
    if not unredeemed:
        # Create a fresh certificate for testing
        from app.core.database import SessionLocal
        from app.models.certificate import Certificate, CertificateStatus
        from app.models.claim import CertificateClaim, ClaimStatus, RiskLevel
        from app.models.plant import Plant, FuelType
        import uuid
        db = SessionLocal()
        plant = db.query(Plant).first()
        test_claim = CertificateClaim(
            claim_uid=f"CLM-TEST-{uuid.uuid4().hex[:6]}",
            plant_id=plant.id,
            submitted_by_user_id=plant.owner_id,
            period_start=datetime.now(timezone.utc),
            period_end=datetime.now(timezone.utc),
            claimed_mwh=100.0,
            submission_fingerprint=f"fp_{uuid.uuid4().hex}",
            status=ClaimStatus.APPROVED,
            risk_score=5.0,
            risk_level=RiskLevel.LOW,
        )
        db.add(test_claim)
        db.flush()
        new_cert = Certificate(
            certificate_uid=f"REC-TEST-{uuid.uuid4().hex[:6]}",
            claim_id=test_claim.id,
            plant_id=plant.id,
            current_owner_id=plant.owner_id,
            fuel_type=FuelType.SOLAR,
            mwh=100.0,
            vintage_year=2026,
            vintage_month=1,
            status=CertificateStatus.ISSUED,
        )
        db.add(new_cert)
        db.commit()
        db.refresh(new_cert)
        cert = {"id": new_cert.id, "status": "ISSUED"}
        db.close()
    else:
        cert = unredeemed[0]

    # Transfer from current owner (via admin permission) to trader
    trader_token = get_token(client, "trader@energytrade.com")
    trader_profile = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {trader_token}"}).json()
    trader_id = trader_profile["id"]

    transfer_res = client.post(
        f"/api/v1/certificates/{cert['id']}/transfer",
        json={"to_user_id": trader_id, "notes": "Bilateral trade contract #991"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert transfer_res.status_code == 200
    transfer_data = transfer_res.json()
    assert transfer_data["to_user_id"] == trader_id
    assert "tx_hash" in transfer_data

    # Trader redeems the certificate
    redeem_res = client.post(
        f"/api/v1/certificates/{cert['id']}/redeem",
        headers={"Authorization": f"Bearer {trader_token}"},
    )
    assert redeem_res.status_code == 200
    assert redeem_res.json()["status"] == "REDEEMED"


def test_investigation_and_regulatory_decision(client):
    """Test regulator reviewing and adjudicating an open investigation case."""
    reg_token = get_token(client, "regulator@recguardian.org")
    cases_res = client.get("/api/v1/investigations/", headers={"Authorization": f"Bearer {reg_token}"})
    assert cases_res.status_code == 200
    cases = cases_res.json()
    assert len(cases) > 0
    target_case = cases[0]

    # Regulator adjudicates case
    decision_res = client.post(
        f"/api/v1/investigations/{target_case['id']}/decision",
        json={
            "decision_action": "CONFIRM_FRAUD_HOLD",
            "findings": "Audit confirms meter reading bypass. Overclaim exceeds physical reality.",
        },
        headers={"Authorization": f"Bearer {reg_token}"},
    )
    assert decision_res.status_code == 200
    decision_data = decision_res.json()
    assert decision_data["decision_action"] == "CONFIRM_FRAUD_HOLD"
    assert decision_data["status"] == "RESOLVED_FRAUD"


def test_certificate_lineage_and_timeline(client):
    """Test 6-stage lineage provenance tracing and evidence timeline generation."""
    token = get_token(client, "auditor@recguardian.org")

    # 1. Trace a fraud claim
    res_claim = client.get(
        "/api/v1/certificates/lineage/CLM-2026-FRAUD-MTR",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_claim.status_code == 200
    claim_lineage = res_claim.json()
    assert claim_lineage["found"] is True
    assert claim_lineage["search_type"] == "CLAIM"
    assert claim_lineage["claim"]["uid"] == "CLM-2026-FRAUD-MTR"
    assert len(claim_lineage["timeline"]) >= 3

    # Verify timeline stage order and properties
    timeline_stages = [item["stage"] for item in claim_lineage["timeline"]]
    assert "GROUND_TRUTH" in timeline_stages
    assert "SUBMISSION" in timeline_stages
    assert "AI_DETECTION" in timeline_stages

    # 2. Trace a secondary market trading cycle
    res_cert = client.get(
        "/api/v1/certificates/lineage/REC-2026-WND-88319",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_cert.status_code == 200
    cert_lineage = res_cert.json()
    assert cert_lineage["found"] is True
    assert cert_lineage["search_type"] == "CERTIFICATE"
    assert len(cert_lineage["transfers"]) >= 3
    assert len(cert_lineage["timeline"]) >= 4
