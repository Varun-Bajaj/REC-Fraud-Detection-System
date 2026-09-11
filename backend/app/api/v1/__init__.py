from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.plants import router as plants_router
from app.api.v1.meters import router as meters_router
from app.api.v1.claims import router as claims_router
from app.api.v1.certificates import router as certificates_router
from app.api.v1.investigations import router as investigations_router
from app.api.v1.ledger import router as ledger_router
from app.api.v1.analytics import router as analytics_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(plants_router)
api_router.include_router(meters_router)
api_router.include_router(claims_router)
api_router.include_router(certificates_router)
api_router.include_router(investigations_router)
api_router.include_router(ledger_router)
api_router.include_router(analytics_router)

__all__ = ["api_router"]
