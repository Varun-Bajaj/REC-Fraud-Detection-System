import hashlib
import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.plant import Plant
from app.models.meter import MeterReading
from app.schemas.meter import MeterReadingCreate, MeterReadingResponse, MeterReadingBatch

router = APIRouter(prefix="/meters", tags=["Smart Meters"])


def hash_meter_payload(data: dict) -> str:
    """Computes SHA-256 integrity hash for raw meter reading."""
    serialized = json.dumps(data, sort_keys=True, default=str)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


@router.post("/readings", response_model=MeterReadingResponse, status_code=status.HTTP_201_CREATED)
def create_meter_reading(
    reading_in: MeterReadingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ingest utility smart meter reading."""
    plant = db.query(Plant).filter(Plant.id == reading_in.plant_id).first()
    if not plant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plant not found.")

    raw_hash = reading_in.raw_meter_hash or hash_meter_payload(reading_in.model_dump())

    meter_reading = MeterReading(
        plant_id=reading_in.plant_id,
        meter_serial_number=reading_in.meter_serial_number,
        interval_start=reading_in.interval_start,
        interval_end=reading_in.interval_end,
        energy_generated_mwh=reading_in.energy_generated_mwh,
        raw_meter_hash=raw_hash,
        telemetry_source=reading_in.telemetry_source,
    )
    db.add(meter_reading)
    db.commit()
    db.refresh(meter_reading)
    return meter_reading


@router.post("/batch", response_model=List[MeterReadingResponse], status_code=status.HTTP_201_CREATED)
def create_batch_meter_readings(
    batch_in: MeterReadingBatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Batch ingest smart meter readings."""
    created_readings = []
    for r in batch_in.readings:
        raw_hash = r.raw_meter_hash or hash_meter_payload(r.model_dump())
        reading = MeterReading(
            plant_id=r.plant_id,
            meter_serial_number=r.meter_serial_number,
            interval_start=r.interval_start,
            interval_end=r.interval_end,
            energy_generated_mwh=r.energy_generated_mwh,
            raw_meter_hash=raw_hash,
            telemetry_source=r.telemetry_source,
        )
        db.add(reading)
        created_readings.append(reading)

    db.commit()
    for reading in created_readings:
        db.refresh(reading)
    return created_readings


@router.get("/plants/{plant_id}", response_model=List[MeterReadingResponse])
def get_meter_readings_for_plant(
    plant_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Query meter telemetry readings for a specific plant."""
    return (
        db.query(MeterReading)
        .filter(MeterReading.plant_id == plant_id)
        .order_by(MeterReading.interval_end.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
