import asyncio
from io import BytesIO

import pytest
import pytest_asyncio
from fastapi import UploadFile
from sqlalchemy import text
from starlette.datastructures import Headers

from src.core.config import settings
from src.crud.project_crud import ProjectCrud
from src.crud.user_crud import UserCrud
from src.db.db_context import DBContext
from src.db.session import Base, engine
from src.schemas.job import JobCreate, LLMModelConfig, ZeroShotPromptingConfig
from src.schemas.llm import Criterion, Decision, LikertDecision, StructuredResponse
from src.schemas.project import Criteria, ProjectCreate
from src.schemas.user import UserCreate
from src.tools.diagnostics.db_check import run_migration

# @pytest.fixture(scope="function")
# def test_client():
#     with TestClient(app) as client:
#         yield client


@pytest_asyncio.fixture
async def test_user_uuid(db_ctx):
    user_crud = db_ctx.crud(UserCrud)
    user = await user_crud.get_user_by_sub("test-user")
    if not user:
        user = await user_crud.create_user(
            UserCreate(sub="test-user", email="test@test.com")
        )
        await db_ctx.commit()
    return user.uuid


@pytest_asyncio.fixture
async def test_project_uuid(db_ctx, test_user_uuid):
    crud = db_ctx.crud(ProjectCrud)
    project_data = ProjectCreate(
        name="Project for Job Test",
        owner_uuid=test_user_uuid,
        criteria=Criteria(
            inclusion_criteria=["A", "B", "C"], exclusion_criteria=["D", "E", "F"]
        ),
    )
    id, project_uuid = await crud.create_project(project_data)
    assert project_uuid

    await db_ctx.commit()

    return project_uuid


@pytest.fixture
def test_job_data(test_project_uuid, test_user_uuid):
    return JobCreate(
        project_uuid=test_project_uuid,
        owner_uuid=test_user_uuid,
        llm_config=LLMModelConfig(
            model_name="test-model",
            model_parameters={"temperature": 0, "top_p": 0.1},
            provider_name="Test provider",
            provider_parameters={},
        ),
        prompting_config=ZeroShotPromptingConfig(),
    )


@pytest.fixture
def test_structured_response():
    return StructuredResponse(
        overall_decision=Decision(
            binary_decision=True,
            probability_decision=0.85,
            likert_decision=LikertDecision.agree,
            reason="Mock reason",
        ),
        inclusion_criteria=[
            Criterion(
                name="A",
                decision=Decision(
                    binary_decision=True,
                    probability_decision=0.9,
                    likert_decision=LikertDecision.agree,
                    reason="Included",
                ),
            )
        ],
        exclusion_criteria=[
            Criterion(
                name="D",
                decision=Decision(
                    binary_decision=False,
                    probability_decision=0.1,
                    likert_decision=LikertDecision.disagree,
                    reason="Excluded",
                ),
            )
        ],
    )


@pytest_asyncio.fixture
async def test_files_working():
    file1 = UploadFile(
        filename="test_file1.csv",
        file=BytesIO(b"title,abstract,doi\nA,B,C"),
        headers=Headers({"content-type": "text/csv"}),
    )
    file2 = UploadFile(
        filename="test_file2.csv",
        file=BytesIO(b"title,abstract,doi\nX,Y,Z"),
        headers=Headers({"content-type": "text/csv"}),
    )
    yield [file1, file2]


@pytest_asyncio.fixture
async def test_files_invalid():
    invalid_file1 = UploadFile(
        filename="invalid_file1.txt",
        file=BytesIO(b"abstract,doi\nTest Abstract,10.1234/test"),
        headers=Headers({"content-type": "text/plain"}),
    )
    invalid_file2 = UploadFile(
        filename="invalid_file2.txt",
        file=BytesIO(b"title,doi\nTest Title,10.1234/test"),
        headers=Headers({"content-type": "text/plain"}),
    )
    invalid_file3 = UploadFile(
        filename="invalid_file3.txt",
        file=BytesIO(b"title,abstract\nTest Title,Test Abstract"),
        headers=Headers({"content-type": "text/plain"}),
    )
    yield [invalid_file1, invalid_file2, invalid_file3]


@pytest.fixture(scope="session", autouse=True)
def reset_db():
    if settings.APP_ENV == "test" and settings.RUN_MIGRATIONS:

        async def drop_and_create():
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.drop_all)
                await conn.run_sync(Base.metadata.create_all)
            await run_migration()

        asyncio.run(drop_and_create())


@pytest_asyncio.fixture(scope="function")
async def db_session():
    raise NotImplementedError


@pytest_asyncio.fixture(scope="function")
async def db_ctx():
    async with DBContext() as ctx:
        yield ctx
        await ctx.rollback()


@pytest_asyncio.fixture
async def committing_db():
    await _truncate_all()
    yield
    await _truncate_all()


@pytest_asyncio.fixture(autouse=True)
async def reset_shared_redis():
    yield
    from src.redis_client.client import close_shared_redis_client

    await close_shared_redis_client()


async def _truncate_all():
    tables = [f'"{t.name}"' for t in Base.metadata.sorted_tables]
    if not tables:
        return
    async with engine.begin() as conn:
        await conn.execute(
            text(f"TRUNCATE {', '.join(tables)} RESTART IDENTITY CASCADE")
        )
