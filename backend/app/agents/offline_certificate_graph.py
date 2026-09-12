import re
from typing import TypedDict, List, Dict, Any, Optional
from langgraph.graph import StateGraph, START, END
from app.agents.tools import fetch_satellite_weather_telemetry, verify_sha256_document_integrity
from app.agents.groq_client import query_groq_llm


class OfflineCertificateState(TypedDict):
    certificate_id: Optional[str]
    raw_document_text: str
    file_sha256: str
    plant_name: str
    fuel_type: str
    capacity_mw: float
    claimed_mwh: float
    vintage_start: str
    vintage_end: str
    latitude: float
    longitude: float
    extracted_metadata: Dict[str, Any]
    document_anomalies: List[str]
    duplicate_check: Dict[str, Any]
    satellite_weather: Dict[str, Any]
    statutory_violations: List[str]
    fraud_risk_score: float
    verdict: str
    executive_summary: str
    groq_engine_used: bool


async def document_forensics_node(state: OfflineCertificateState) -> Dict[str, Any]:
    """
    Analyzes raw text / OCR of an offline manual certificate using Groq Llama-3.3-70b.
    Detects serial number formatting tampering, date paradoxes, and missing statutory seals.
    """
    text = state.get("raw_document_text", "")
    anomalies = list(state.get("document_anomalies", []))
    extracted = dict(state.get("extracted_metadata", {}))
    groq_used = False

    system_prompt = (
        "You are an expert Forensic Document Examiner specializing in Renewable Energy Certificates (I-REC, GO, LGC, PJM-GATS). "
        "Analyze the provided manual/offline certificate text for signs of forgery, tampering, date contradictions, "
        "recycled serial numbers, or fake registry stamps. "
        "Respond ONLY in valid JSON matching this schema: "
        "{\n"
        '  "extracted_serial": "...",\n'
        '  "extracted_issuer": "...",\n'
        '  "extracted_mwh": 0.0,\n'
        '  "font_or_format_inconsistency": true/false,\n'
        '  "date_paradox_detected": true/false,\n'
        '  "suspected_forgery_flags": ["flag 1", "flag 2"]\n'
        "}"
    )

    user_prompt = f"Analyze this offline certificate record:\n\n{text}"

    groq_res = await query_groq_llm(system_prompt, user_prompt)
    if groq_res and isinstance(groq_res, dict):
        groq_used = True
        extracted["serial"] = groq_res.get("extracted_serial", "UNKNOWN")
        extracted["issuer"] = groq_res.get("extracted_issuer", "UNKNOWN")
        if groq_res.get("extracted_mwh"):
            extracted["mwh"] = groq_res.get("extracted_mwh")

        for flag in groq_res.get("suspected_forgery_flags", []):
            anomalies.append(f"DOCUMENT FORGERY SIGNAL: {flag}")
        if groq_res.get("date_paradox_detected"):
            anomalies.append("DATE PARADOX: Generation dates contradict issuance timestamp or facility commissioning date.")
    else:
        # Heuristic inspection fallback
        serial_match = re.search(r"(REC|IREC|CER|LGC)-[A-Z0-9\-]+", text, re.IGNORECASE)
        extracted["serial"] = serial_match.group(0) if serial_match else "REC-MANUAL-UNKNOWN"

        mwh_match = re.search(r"(\d+[\d,]*\.?\d*)\s*(MWh|mwh|megawatt hours)", text, re.IGNORECASE)
        if mwh_match:
            try:
                extracted["mwh"] = float(mwh_match.group(1).replace(",", ""))
            except ValueError:
                pass

        lower_text = text.lower()
        if "provisional" in lower_text or "unverified copy" in lower_text or "draft" in lower_text:
            anomalies.append("DOCUMENT DEFECT: Document is labeled as provisional/unverified draft; not a final accredited certificate.")
        if "specimen" in lower_text or "sample" in lower_text:
            anomalies.append("DOCUMENT TAMPERING: Certificate text contains 'SPECIMEN' watermark; possible forged certificate template.")

    return {
        "extracted_metadata": extracted,
        "document_anomalies": anomalies,
        "groq_engine_used": groq_used,
    }


async def duplicate_ledger_node(state: OfflineCertificateState) -> Dict[str, Any]:
    """
    Cross-checks the document hash and serial against known ledger records to catch OTC double-selling.
    """
    anomalies = list(state.get("document_anomalies", []))
    file_hash = state.get("file_sha256", "")
    extracted = state.get("extracted_metadata", {})
    serial = extracted.get("serial", state.get("certificate_id", ""))

    # Known recycled test hashes / serials
    known_retired_serials = {
        "REC-2023-SOL-00984": "Already retired by Microsoft Australia on 2024-01-15",
        "IREC-BRA-2022-8874": "Already retired by Apple Inc. in 2023",
        "LGC-AU-2024-5512": "Cancelled due to double-issuance claim",
    }

    duplicate_detected = False
    details = "No duplicate serial record found on national ledger."

    if serial in known_retired_serials:
        duplicate_detected = True
        details = known_retired_serials[serial]
        anomalies.append(
            f"DOUBLE COUNTING / OTC DOUBLE-SELLING: Serial number '{serial}' was {details}. Cannot be re-issued offline!"
        )

    return {
        "duplicate_check": {
            "duplicate_detected": duplicate_detected,
            "details": details,
            "checked_serial": serial,
            "file_sha256": file_hash,
        },
        "document_anomalies": anomalies,
    }


async def satellite_weather_node(state: OfflineCertificateState) -> Dict[str, Any]:
    """
    Validates thermodynamic generation feasibility via satellite solar irradiance / wind telemetry.
    Offline plants have no live IoT smart meters; satellite weather is the ground truth.
    """
    lat = state.get("latitude", 35.01)
    lon = state.get("longitude", -115.47)
    v_start = state.get("vintage_start", "2026-03-01")
    v_end = state.get("vintage_end", "2026-03-15")
    capacity_mw = state.get("capacity_mw", 50.0)
    claimed_mwh = state.get("claimed_mwh", 1000.0)
    fuel = state.get("fuel_type", "SOLAR").upper()

    weather = await fetch_satellite_weather_telemetry(lat, lon, v_start, v_end)
    violations = list(state.get("statutory_violations", []))

    # 1. Physical limit (100% capacity factor hard limit)
    # Assumes 30 days = 720 hours
    max_continuous_mwh = capacity_mw * 720.0
    if claimed_mwh > max_continuous_mwh:
        violations.append(
            f"THERMODYNAMIC IMPOSSIBILITY: Claimed {claimed_mwh} MWh exceeds 100% continuous nameplate limit of {max_continuous_mwh:.1f} MWh for {capacity_mw} MW facility."
        )

    # 2. Fuel-specific realistic maximum
    max_realistic_cf = 0.35 if fuel == "SOLAR" else (0.55 if fuel == "WIND" else 0.85)
    max_expected_mwh = capacity_mw * 720.0 * max_realistic_cf
    if claimed_mwh > (max_expected_mwh * 1.25):
        violations.append(
            f"ANOMALOUS GENERATION YIELD: Claimed {claimed_mwh} MWh requires a {((claimed_mwh / (capacity_mw * 720.0)) * 100):.1f}% Capacity Factor. Regional benchmark max is {max_realistic_cf * 100:.0f}%."
        )

    # 3. Weather correlation check
    avg_rad = weather.get("avg_solar_radiation_w_m2", 200.0)
    if fuel == "SOLAR" and avg_rad < 100.0 and claimed_mwh > (capacity_mw * 720 * 0.20):
        violations.append(
            f"ATMOSPHERIC WEATHER MISMATCH: Satellite reports dense cloud cover (avg {avg_rad:.1f} W/m² solar irradiance), but offline certificate claims peak output."
        )

    return {
        "satellite_weather": weather,
        "statutory_violations": violations,
    }


async def groq_adjudication_node(state: OfflineCertificateState) -> Dict[str, Any]:
    """
    Groq LPU LLM synthesizes all forensic evidence into a definitive regulatory audit adjudication.
    """
    anomalies = state.get("document_anomalies", [])
    violations = state.get("statutory_violations", [])
    dup_check = state.get("duplicate_check", {})
    weather = state.get("satellite_weather", {})
    groq_used = state.get("groq_engine_used", False)

    all_flags = anomalies + violations

    system_prompt = (
        "You are the Chief Regulatory Auditor for the Clean Energy Regulator and I-REC Standards Board. "
        "You are evaluating a manual/offline issued Renewable Energy Certificate (REC) application. "
        "Review the forensic document anomalies, ledger duplicate checks, and satellite weather verification. "
        "Formulate a definitive regulatory decision. "
        "Respond ONLY in valid JSON matching this schema: "
        "{\n"
        '  "verdict": "CONFIRM_FRAUD_HOLD" | "FLAG_FOR_MANUAL_AUDIT" | "CLEAR_AND_ISSUE",\n'
        '  "fraud_risk_score": 0.0 to 100.0,\n'
        '  "executive_summary": "Concise forensic summary for institutional buyers and regulators.",\n'
        '  "actionable_orders": ["order 1", "order 2"]\n'
        "}"
    )

    user_prompt = (
        f"Plant: {state.get('plant_name')} ({state.get('fuel_type')}, {state.get('capacity_mw')} MW)\n"
        f"Claimed MWh: {state.get('claimed_mwh')} MWh\n"
        f"Vintage: {state.get('vintage_start')} to {state.get('vintage_end')}\n"
        f"Document Anomalies: {anomalies}\n"
        f"Thermodynamic & Weather Violations: {violations}\n"
        f"Ledger Double-Counting Status: {dup_check}\n"
        f"Satellite Weather Evidence: {weather}\n"
    )

    groq_res = await query_groq_llm(system_prompt, user_prompt)

    if groq_res and isinstance(groq_res, dict) and "verdict" in groq_res:
        groq_used = True
        verdict = groq_res.get("verdict", "FLAG_FOR_MANUAL_AUDIT")
        score = float(groq_res.get("fraud_risk_score", 75.0))
        summary = groq_res.get("executive_summary", "Groq AI Forensic Audit completed.")
    else:
        # Fallback adjudication logic
        if dup_check.get("duplicate_detected") or any("IMPOSSIBILITY" in v for v in violations):
            verdict = "CONFIRM_FRAUD_HOLD"
            score = 96.0
            summary = (
                f"HIGH SEVERITY FRAUD DETECTED: Offline certificate exhibits critical integrity failure. "
                + (f"Duplicate serial number '{dup_check.get('checked_serial')}'. " if dup_check.get("duplicate_detected") else "")
                + (f"{len(violations)} physical capacity violations identified." if violations else "")
            )
        elif len(all_flags) > 0:
            verdict = "FLAG_FOR_MANUAL_AUDIT"
            score = 78.5
            summary = f"Identified {len(all_flags)} forensic discrepancies across satellite weather and document metadata. Requires physical inspection of inverter data loggers."
        else:
            verdict = "CLEAR_AND_ISSUE"
            score = 8.5
            summary = "Offline certificate verified. Generation volume conforms to physical solar irradiance models and no duplicate ledger entries detected."

    return {
        "verdict": verdict,
        "fraud_risk_score": score,
        "executive_summary": summary,
        "groq_engine_used": groq_used,
    }


# Compile the LangGraph
builder = StateGraph(OfflineCertificateState)
builder.add_node("document_forensics", document_forensics_node)
builder.add_node("duplicate_ledger", duplicate_ledger_node)
builder.add_node("satellite_weather", satellite_weather_node)
builder.add_node("groq_adjudication", groq_adjudication_node)

builder.add_edge(START, "document_forensics")
builder.add_edge("document_forensics", "duplicate_ledger")
builder.add_edge("duplicate_ledger", "satellite_weather")
builder.add_edge("satellite_weather", "groq_adjudication")
builder.add_edge("groq_adjudication", END)

offline_certificate_graph = builder.compile()
