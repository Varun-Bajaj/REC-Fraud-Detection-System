from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.plant import FuelType, PlantStatus


class PlantBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    fuel_type: FuelType
    nameplate_capacity_mw: float = Field(..., gt=0.0)
    grid_interconnection_id: str = Field(..., min_length=3, max_length=100)
    location_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    commissioning_date: Optional[datetime] = None
    max_capacity_factor: float = Field(0.50, gt=0.0, le=1.0)


class PlantCreate(PlantBase):
    pass


class PlantUpdate(BaseModel):
    name: Optional[str] = None
    nameplate_capacity_mw: Optional[float] = None
    location_address: Optional[str] = None
    status: Optional[PlantStatus] = None
    max_capacity_factor: Optional[float] = None


class PlantResponse(PlantBase):
    id: int
    owner_id: int
    status: PlantStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
