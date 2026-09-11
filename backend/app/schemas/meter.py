from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class MeterReadingBase(BaseModel):
    plant_id: int
    meter_serial_number: str = Field(..., min_length=3, max_length=100)
    interval_start: datetime
    interval_end: datetime
    energy_generated_mwh: float = Field(..., ge=0.0)
    telemetry_source: str = "UTILITY_SMART_METER"


class MeterReadingCreate(MeterReadingBase):
    raw_meter_hash: Optional[str] = None


class MeterReadingResponse(MeterReadingBase):
    id: int
    raw_meter_hash: Optional[str] = None
    recorded_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MeterReadingBatch(BaseModel):
    readings: List[MeterReadingCreate]
