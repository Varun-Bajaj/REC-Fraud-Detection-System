import asyncio
import os
from app.agents.offline_certificate_graph import offline_certificate_graph

async def test_offline_fraud_detection():
    print("==================================================================")
    print("TESTING OFFLINE / MANUAL REC FRAUD DETECTION GRAPH (LangGraph + Groq)")
    print("==================================================================")

    # Test Case 1: Forged Scanned Certificate with Duplicate Serial & Impossible Solar Generation
    sample_forged_certificate_text = """
    OFFICIAL RENEWABLE ENERGY GENERATION CERTIFICATE
    ISSUER: Independent Clean Energy Registry
    FACILITY: Mojave Desert Solar One (50 MW Nameplate Capacity)
    SERIAL NO: REC-2023-SOL-00984
    PERIOD: 2026-03-01 to 2026-03-31
    VOLUME: 75,000.00 MWh
    ATTESTATION: Manual meter reading verified by local off-grid contractor.
    STATUS: PROVISIONAL DRAFT / SPECIMEN
    """

    state_input = {
        "certificate_id": "REC-2023-SOL-00984",
        "raw_document_text": sample_forged_certificate_text,
        "file_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "plant_name": "Mojave Desert Solar One",
        "fuel_type": "SOLAR",
        "capacity_mw": 50.0,
        "claimed_mwh": 75000.0,  # 50MW * 720h = 36,000 MWh max possible even with 24/7 sunlight! 75,000 is 200% impossible
        "vintage_start": "2026-03-01",
        "vintage_end": "2026-03-31",
        "latitude": 35.011,
        "longitude": -115.473,
        "extracted_metadata": {},
        "document_anomalies": [],
        "duplicate_check": {},
        "satellite_weather": {},
        "statutory_violations": [],
        "fraud_risk_score": 0.0,
        "verdict": "",
        "executive_summary": "",
        "groq_engine_used": False,
    }

    print("\nRunning LangGraph on Suspicious Offline Certificate...")
    result = await offline_certificate_graph.ainvoke(state_input)

    print("\n--- AUDIT RESULTS ---")
    print(f"Verdict:            {result.get('verdict')}")
    print(f"Fraud Risk Score:   {result.get('fraud_risk_score')}/100.0")
    print(f"Groq Engine Active: {result.get('groq_engine_used')}")
    print(f"\nDocument Anomalies ({len(result.get('document_anomalies', []))}):")
    for anom in result.get("document_anomalies", []):
        print(f"  [!] {anom}")

    print(f"\nPhysics & Atmospheric Violations ({len(result.get('statutory_violations', []))}):")
    for viol in result.get("statutory_violations", []):
        print(f"  [X] {viol}")

    summary_safe = result.get('executive_summary', '').encode('ascii', errors='replace').decode('ascii')
    print(f"\nExecutive Summary:\n{summary_safe}")
    print(f"\nDuplicate Check: {result.get('duplicate_check')}")

    # Assertions
    assert result.get("verdict") in ["CONFIRM_FRAUD_HOLD", "FLAG_FOR_MANUAL_AUDIT"]
    assert result.get("fraud_risk_score") >= 75.0
    print("\n[SUCCESS] Offline REC LangGraph graph successfully caught the fraudulent certificate!")

if __name__ == "__main__":
    asyncio.run(test_offline_fraud_detection())
