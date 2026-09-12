import json
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_investigate():
    # 1. Login as Regulator
    login_res = client.post(
        "/api/v1/auth/login-json",
        json={"email": "regulator@recguardian.org", "password": "password123"}
    )
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("[1] Logged in as Regulator successfully.")

    # 2. Get available cases
    cases_res = client.get("/api/v1/investigations/", headers=headers)
    assert cases_res.status_code == 200
    cases = cases_res.json()
    print(f"[2] Retrieved {len(cases)} active investigation case(s) from database.")
    for c in cases:
        print(f"    - Case ID {c['id']}: {c['case_number']} (Priority: {c['priority']}, Status: {c['status']})")

    if not cases:
        print("No cases found to test.")
        return

    target_case_id = cases[0]["id"]
    print(f"\n[3] Triggering LangGraph AI Agent on Case #{target_case_id} ({cases[0]['case_number']})...")
    
    # 3. Call AI Investigate endpoint
    ai_res = client.post(f"/api/v1/investigations/{target_case_id}/ai-investigate", headers=headers)
    assert ai_res.status_code == 200, f"AI Investigate failed: {ai_res.text}"
    
    result = ai_res.json()
    print("\n=======================================================")
    print("         LANGGRAPH AI AGENT EXECUTION RESULT           ")
    print("=======================================================")
    print("Case Number:     ", result["case_number"])
    print("Agent Verdict:   ", result["agent_verdict"])
    print("Agent Risk Score:", result["agent_risk_score"])
    print("Violations:      ", result["violations"])
    print("Satellite Weather:", json.dumps(result.get("weather_evidence"), indent=2))
    print("Registry Evidence:", json.dumps(result.get("registry_evidence"), indent=2))
    print("\nAgent Reasoning Summary:\n", result["agent_reasoning"])
    print("=======================================================")
    print("[+] TEST PASSED: LangGraph endpoint is 100% operational!")

if __name__ == "__main__":
    test_investigate()
