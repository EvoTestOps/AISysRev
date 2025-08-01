import pytest
import pytest_asyncio
import asyncio
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession
from src.main import app
from src.db.session import AsyncSessionLocal, Base, engine
from src.core.config import settings

@pytest.fixture(scope="function")
def test_client():
    with TestClient(app) as client:
        yield client

@pytest.fixture(scope="session", autouse=True)
def reset_db():
    if settings.APP_ENV == "test":
        async def drop_and_create():
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.drop_all)
                await conn.run_sync(Base.metadata.create_all)
        asyncio.run(drop_and_create())

@pytest_asyncio.fixture(scope="function")
async def db_session():
    async_session = AsyncSessionLocal()
    async with async_session as session:
        yield session