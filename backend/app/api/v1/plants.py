from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.user import User, UserRole
from app.models.plant import Plant, FuelType
from app.schemas.plant import PlantCreate, PlantResponse, PlantUpdate

router = APIRouter(prefix="/plants", tags=["Plants"])


@router.post("/", response_model=PlantResponse, status_code=status.HTTP_201_CREATED)
def create_plant(
    plant_in: PlantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.GENERATOR, UserRole.ADMIN])),
):
    """Register a new renewable energy generation plant."""
    existing_interconnection = (
        db.query(Plant)
        .filter(Plant.grid_interconnection_id == plant_in.grid_interconnection_id)
        .first()
    )
    if existing_interconnection:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Grid interconnection ID '{plant_in.grid_interconnection_id}' is already registered to another plant.",
        )

    plant = Plant(
        owner_id=current_user.id,
        name=plant_in.name,
        fuel_type=plant_in.fuel_type,
        nameplate_capacity_mw=plant_in.nameplate_capacity_mw,
        grid_interconnection_id=plant_in.grid_interconnection_id,
        location_address=plant_in.location_address,
        latitude=plant_in.latitude,
        longitude=plant_in.longitude,
        commissioning_date=plant_in.commissioning_date,
        max_capacity_factor=plant_in.max_capacity_factor,
    )
    db.add(plant)
    db.commit()
    db.refresh(plant)
    return plant


@router.get("/", response_model=List[PlantResponse])
def list_plants(
    fuel_type: Optional[FuelType] = None,
    owner_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List registered plants with optional filtering."""
    query = db.query(Plant)
    if fuel_type:
        query = query.filter(Plant.fuel_type == fuel_type)
    if owner_id:
        query = query.filter(Plant.owner_id == owner_id)
    elif current_user.role == UserRole.GENERATOR:
        # Generators only see their own plants by default
        query = query.filter(Plant.owner_id == current_user.id)

    return query.offset(skip).limit(limit).all()


@router.get("/{plant_id}", response_model=PlantResponse)
def get_plant(
    plant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve details for a specific plant."""
    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    if not plant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plant not found.")
    return plant
