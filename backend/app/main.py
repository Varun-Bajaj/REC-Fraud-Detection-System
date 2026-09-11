import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import settings
from app.core.database import Base, engine, SessionLocal
from app.api.v1 import api_router
from app.engines.ledger_engine import LedgerEngine
from app.seeds.seed_data import seed_database

static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan startup and shutdown handler."""
    # Ensure database schema is created
    Base.metadata.create_all(bind=engine)

    # Initialize Genesis block and seed realistic demo fraud data
    db = SessionLocal()
    try:
        LedgerEngine.initialize_genesis_block(db)
        seed_database()
    finally:
        db.close()

    yield


app = FastAPI(
    title=settings.APP_NAME,
    description=settings.APP_DESCRIPTION,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS middleware for Next.js / React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static assets
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Include API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Frontend"])
@app.get("/app", tags=["Frontend"])
def serve_dashboard():
    """Serves the interactive REC Guardian forensic intelligence dashboard."""
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {
        "platform": settings.APP_NAME,
        "status": "OPERATIONAL",
        "docs_url": "/docs",
        "api_v1": settings.API_V1_STR,
    }


@app.get("/health", tags=["Health"])
def health_check():
    """Liveness probe."""
    return {"status": "healthy"}
