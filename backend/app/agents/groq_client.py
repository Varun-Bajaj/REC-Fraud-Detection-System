import json
import logging
import re
import os
import httpx
from typing import Dict, Any, Optional
from app.config import settings

logger = logging.getLogger(__name__)

def _clean_and_parse_json(raw: str) -> Dict[str, Any]:
    """Cleans code blocks and extracts JSON object."""
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        cleaned = "\n".join(lines).strip()

    try:
        return json.loads(cleaned)
    except Exception:
        # Match outermost JSON object { ... }
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        raise

async def query_groq_llm(
    system_prompt: str,
    user_prompt: str,
    model: Optional[str] = None,
    json_mode: bool = True
) -> Optional[Dict[str, Any]]:
    """
    Executes an ultra-low-latency inference call to Groq LPU Cloud.
    Pure-Python HTTPX implementation: 100% Device Guard compliant, no external binaries.
    Falls back gracefully if GROQ_API_KEY is not configured or offline.
    """
    api_key = settings.GROQ_API_KEY or os.getenv("GROQ_API_KEY")
    primary_model = model or settings.GROQ_MODEL or "openai/gpt-oss-120b"
    candidate_models = [primary_model, "openai/gpt-oss-120b", "openai/gpt-oss-20b", "groq/compound"]
    
    # Deduplicate while preserving order
    seen = set()
    models_to_try = []
    for m in candidate_models:
        if m and m not in seen:
            seen.add(m)
            models_to_try.append(m)

    if api_key and api_key.strip():
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key.strip()}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            for current_model in models_to_try:
                try:
                    body: Dict[str, Any] = {
                        "model": current_model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        "temperature": 0.1,
                    }
                    if json_mode:
                        body["response_format"] = {"type": "json_object"}

                    response = await client.post(url, headers=headers, json=body)
                    if response.status_code == 200:
                        data = response.json()
                        content = data["choices"][0]["message"]["content"]
                        if json_mode:
                            return _clean_and_parse_json(content)
                        return {"raw_text": content}
                    else:
                        logger.warning(
                            f"Groq model '{current_model}' returned status {response.status_code}: {response.text[:120]}. Trying fallback..."
                        )
                except Exception as exc:
                    logger.warning(f"Groq call with model '{current_model}' error: {exc}. Trying fallback...")

    # Graceful heuristic fallback if GROQ_API_KEY is missing or all models failed
    logger.info("Using local expert rule-based reasoning engine.")
    return None
