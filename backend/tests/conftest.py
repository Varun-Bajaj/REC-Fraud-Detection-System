import os
import sys
import pytest
from fastapi.testclient import TestClient

# Ensure backend dir is on path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app
from app.core.database import Base, engine, SessionLocal
from app.seeds.seed_data import seed_database


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Initializes schema and seeds baseline dataset before running tests."""
    seed_database(force_reseed=True)
    yield
    seed_database(force_reseed=True)


@pytest.fixture(scope="module")
def db_session():
    """Provides a database session for test cases."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="module")
def client():
    """Provides FastAPI TestClient."""
    with TestClient(app) as test_client:
        yield test_client
