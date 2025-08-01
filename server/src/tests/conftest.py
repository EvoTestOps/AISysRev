import pytest
import pytest_asyncio
import asyncio
from fastapi.testclient import TestClient
from src.main import app
from src.core.config import settings
from src.db.session import AsyncSessionLocal, Base, engine
from src.tools.diagnostics.db_check import run_migration
from src.crud.project_crud import ProjectCrud
from src.schemas.project import ProjectCreate

@pytest.fixture(scope="function")
def test_client():
    with TestClient(app) as client:
        yield client

@pytest_asyncio.fixture
async def test_project_uuid(db_session):
    crud = ProjectCrud(db_session)
    project_data = ProjectCreate(
        name="Project for Job Test",
        inclusion_criteria="A",
        exclusion_criteria="B"
    )
    id, project_uuid = await crud.create_project(project_data)
    assert project_uuid
    return project_uuid

@pytest.fixture(scope="session", autouse=True)
def reset_db():
    if settings.APP_ENV == "test":
        async def drop_and_create():
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.drop_all)
                await conn.run_sync(Base.metadata.create_all)
            await run_migration()
        asyncio.run(drop_and_create())

@pytest_asyncio.fixture(scope="function")
async def db_session():
    async_session = AsyncSessionLocal()
    async with async_session as session:
        yield session