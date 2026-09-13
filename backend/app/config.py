import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "REC Guardian"
    APP_DESCRIPTION: str = (
        "AI-Powered Renewable Energy Certificate Fraud Detection & Forensic Intelligence Platform"
    )
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Security
    SECRET_KEY: str = "rec-guardian-super-secret-key-change-in-production-2026-auth"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Groq AI Settings
    GROQ_API_KEY: Optional[str] = os.getenv("GROQ_API_KEY", None)
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./rec_guardian.db")

    # Fabric DLT Gateway
    FABRIC_GATEWAY_URL: str = os.getenv("FABRIC_GATEWAY_URL", "http://localhost:5050")
    FABRIC_SIMULATOR_FALLBACK: bool = os.getenv("FABRIC_SIMULATOR_FALLBACK", "true").lower() in ("true", "1", "yes")
    FABRIC_SIMULATOR_MODE: bool = os.getenv("FABRIC_SIMULATOR_MODE", "false").lower() in ("true", "1", "yes")

    # Document Uploads
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")

    # Risk Engine Weights
    WEIGHT_RULES: float = 0.45
    WEIGHT_ML: float = 0.30
    WEIGHT_GRAPH: float = 0.25

    # Risk Thresholds
    RISK_THRESHOLD_LOW: float = 25.0
    RISK_THRESHOLD_HIGH: float = 65.0

    # Rule Engine Tolerances
    METER_DISCREPANCY_TOLERANCE_PERCENT: float = 2.0  # 2% discrepancy threshold
    MAX_SOLAR_CAPACITY_FACTOR: float = 0.40  # Max realistic solar capacity factor
    MAX_WIND_CAPACITY_FACTOR: float = 0.65   # Max realistic wind capacity factor
    MAX_HYDRO_CAPACITY_FACTOR: float = 0.85  # Max realistic hydro capacity factor
    MAX_THEORETICAL_CAPACITY_FACTOR: float = 1.05  # Absolute hard cap

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=(".env", "backend/.env"),
        extra="ignore",
    )


settings = Settings()
