import pytest
import pytest_asyncio
import asyncio
from io import BytesIO
from random import random
from fastapi import UploadFile
from fastapi.testclient import TestClient
from starlette.datastructures import Headers
from src.main import app
from src.core.config import settings
from src.db.session import AsyncSessionLocal, Base, engine
from src.tools.diagnostics.db_check import run_migration
from src.crud.project_crud import ProjectCrud
from src.schemas.project import ProjectCreate, Criteria
from src.schemas.job import JobCreate, ModelConfig

@pytest.fixture(scope="function")
def test_client():
    with TestClient(app) as client:
        yield client

@pytest_asyncio.fixture
async def test_project_uuid(db_session):
    crud = ProjectCrud(db_session)
    project_data = ProjectCreate(
        name="Project for Job Test",
        criteria=Criteria(
            inclusion_criteria=["A", "B", "C"],
            exclusion_criteria=["D", "E", "F"]
        )
    )
    id, project_uuid = await crud.create_project(project_data)
    assert project_uuid
    return project_uuid

@pytest.fixture
def test_job_data(test_project_uuid):
    return JobCreate(
        project_uuid=test_project_uuid,
        llm_config=ModelConfig(
            model_name="test-model",
            temperature=round(random(), 1),
            seed=42,
            top_p=round(random(), 1)
        )
    )

@pytest_asyncio.fixture
async def test_files_working():
    file1 = UploadFile(
        filename="test_file1.csv",
        file=BytesIO(b"title,abstract,doi\nA,B,C"),
        headers=Headers({"content-type": "text/csv"})
    )
    file2 = UploadFile(
        filename="test_file2.csv",
        file=BytesIO(b"title,abstract,doi\nX,Y,Z"),
        headers=Headers({"content-type": "text/csv"})
    )
    yield [file1, file2]

@pytest_asyncio.fixture
async def test_files_invalid():
    invalid_file1 = UploadFile(
        filename="invalid_file1.txt",
        file=BytesIO(b"abstract,doi\nTest Abstract,10.1234/test"),
        headers=Headers({"content-type": "text/plain"})
    )
    invalid_file2 = UploadFile(
        filename="invalid_file2.txt",
        file=BytesIO(b"title,doi\nTest Title,10.1234/test"),
        headers=Headers({"content-type": "text/plain"})
    )
    invalid_file3 = UploadFile(
        filename="invalid_file3.txt",
        file=BytesIO(b"title,abstract\nTest Title,Test Abstract"),
        headers=Headers({"content-type": "text/plain"})
    )
    yield [invalid_file1, invalid_file2, invalid_file3]

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