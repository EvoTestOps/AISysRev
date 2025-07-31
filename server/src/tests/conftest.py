import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession
from src.main import app
from src.db.session import AsyncSessionLocal

@pytest.fixture(scope="function")
def test_client():
    with TestClient(app) as client:
        yield client

@pytest.fixture(scope="function")
def project_payload():
    return {
        "name": "Test Project",
        "inclusion_criteria": "Must be peer reviewed",
        "exclusion_criteria": "Not in English"
    }

@pytest_asyncio.fixture(scope="function")
async def db_session():
    async_session = AsyncSessionLocal()
    async with async_session as session:
        yield session