from typing import TypedDict, List, Dict, Any
from langgraph.graph import StateGraph, START, END
from app.agents.tools import query_clean_energy_registry_http, fetch_satellite_weather_telemetry

class ForensicInvestigationState(TypedDict):
    claim_id: int
    claim_uid: str
    plant_name: str
    claimed_mwh: float
    meter_mwh: float
    latitude: float
    longitude: float
    registry_data: Dict[str, Any]
    weather_data: Dict[str, Any]
    violations: List[str]
    risk_score: float
    verdict: str  # "CONFIRM_FRAUD_HOLD" | "CLEAR_AND_ISSUE"
    reasoning: str


async def registry_scraper_node(state: ForensicInvestigationState) -> Dict[str, Any]:
    """Scrapes government / market registry records for the generation facility."""
    reg = await query_clean_energy_registry_http(state["plant_name"])
    violations = list(state.get("violations", []))
    
    cap = reg.get("accredited_capacity_mw", 50.0)
    # Absolute physical limit in 1 month (720 hrs at 100% capacity factor)
    abs_limit = cap * 720.0
    if state["claimed_mwh"] > abs_limit:
        violations.append(
            f"PHYSICAL IMPOSSIBILITY: Claimed {state['claimed_mwh']} MWh exceeds 100% continuous nameplate limit of {abs_limit} MWh (by {((state['claimed_mwh']/abs_limit) - 1)*100:.1f}%)."
        )

    # Meter vs claim deviation check
    if state.get("meter_mwh") and state["meter_mwh"] > 0:
        delta = (state["claimed_mwh"] - state["meter_mwh"]) / state["meter_mwh"]
        if delta > 0.05:
            violations.append(
                f"SMART METER MISMATCH: Claimed volume exceeds revenue meter reading by {delta * 100:.1f}% (Meter: {state['meter_mwh']} MWh vs Claim: {state['claimed_mwh']} MWh)."
            )

    return {
        "registry_data": reg,
        "violations": violations
    }


async def weather_physics_node(state: ForensicInvestigationState) -> Dict[str, Any]:
    """Cross-references satellite atmospheric solar irradiance and weather telemetry."""
    lat = state.get("latitude", 35.011)
    lon = state.get("longitude", -115.473)
    weather = await fetch_satellite_weather_telemetry(lat, lon)
    
    violations = list(state.get("violations", []))
    # If solar radiation is very low but claims are unusually high
    if weather.get("avg_solar_radiation_w_m2", 200) < 100 and state["claimed_mwh"] > 3000:
        violations.append(
            f"WEATHER INCONSISTENCY: Satellite solar irradiance was abnormally low ({weather.get('avg_solar_radiation_w_m2')} W/m²) relative to claimed solar yield."
        )

    return {
        "weather_data": weather,
        "violations": violations
    }


async def forensic_synthesis_node(state: ForensicInvestigationState) -> Dict[str, Any]:
    """Synthesizes all autonomous tool findings into a final regulatory adjudication recommendation."""
    violations = state.get("violations", [])
    
    if len(violations) > 0:
        verdict = "CONFIRM_FRAUD_HOLD"
        risk_score = 92.5 if any("PHYSICAL" in v for v in violations) else 85.0
        reasoning = (
            f"Autonomous multi-agent investigation identified {len(violations)} critical statutory violation(s):\n"
            + "\n".join(f"- {v}" for v in violations)
            + f"\n\nRecommendation: Confirm regulatory freeze under Clean Energy Act. Prevent REC minting."
        )
    else:
        verdict = "CLEAR_AND_ISSUE"
        risk_score = 12.0
        reasoning = (
            f"Multi-agent investigation verified all parameters against accredited registry records and satellite irradiance. "
            f"Claim volume ({state['claimed_mwh']} MWh) aligns with smart meter telemetry and plant capacity. "
            f"Recommendation: Clear anomaly and mint verified REC certificate."
        )

    return {
        "verdict": verdict,
        "risk_score": risk_score,
        "reasoning": reasoning,
    }


# Construct the StateGraph
builder = StateGraph(ForensicInvestigationState)
builder.add_node("registry_scraper", registry_scraper_node)
builder.add_node("weather_physics", weather_physics_node)
builder.add_node("forensic_synthesis", forensic_synthesis_node)

builder.add_edge(START, "registry_scraper")
builder.add_edge("registry_scraper", "weather_physics")
builder.add_edge("weather_physics", "forensic_synthesis")
builder.add_edge("forensic_synthesis", END)

# Compiled Graph ready for execution
forensic_investigation_graph = builder.compile()
