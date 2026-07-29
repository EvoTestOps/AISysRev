from uuid import UUID

import pytest

from src.crud.job_crud import JobCrud
from src.crud.project_crud import ProjectCrud
from src.crud.user_crud import UserCrud
from src.schemas.job import JobCreate, ZeroShotPromptingConfig, LLMModelConfig
from src.schemas.project import Criteria, ProjectCreate
from src.schemas.user import UserCreate


async def _create_owned_project(db_ctx, sub: str) -> tuple[UUID, UUID]:
    user_crud = db_ctx.crud(UserCrud)
    user = await user_crud.create_user(UserCreate(sub=sub, email=f"{sub}@test.com"))

    project_crud = db_ctx.crud(ProjectCrud)
    _, project_uuid = await project_crud.create_project(
        ProjectCreate(
            name="Project for Job Test",
            owner_uuid=user.uuid,
            criteria=Criteria(
                inclusion_criteria=["A", "B", "C"], exclusion_criteria=["D", "E", "F"]
            ),
        )
    )
    return project_uuid, user.uuid


def _make_job_create(
    project_uuid: UUID,
    owner_uuid: UUID,
    model_name: str = "test-model",
    model_parameters: dict | None = None,
) -> JobCreate:
    return JobCreate(
        project_uuid=project_uuid,
        owner_uuid=owner_uuid,
        llm_config=LLMModelConfig(
            model_name=model_name,
            model_parameters=model_parameters or {"temperature": 0, "top_p": 0.1},
            provider_name="Test provider",
            provider_parameters={},
        ),
        prompting_config=ZeroShotPromptingConfig(),
    )


@pytest.mark.asyncio
async def test_fetch_jobs(db_ctx):
    project_uuid, owner_uuid = await _create_owned_project(db_ctx, "test-fetch-jobs-owner")

    crud = db_ctx.crud(JobCrud)
    job_data = _make_job_create(project_uuid, owner_uuid)

    for i in range(1, 6):
        await crud.create_job(job_data)

    jobs = await crud.fetch_jobs(owner_uuid)

    assert jobs is not None
    assert len(jobs) == 5


@pytest.mark.asyncio
async def test_create_and_fetch_job_crud(db_ctx):
    project_uuid, owner_uuid = await _create_owned_project(db_ctx, "test-create-fetch-job-owner")
    job_data = _make_job_create(project_uuid, owner_uuid)

    crud = db_ctx.crud(JobCrud)

    created_job = await crud.create_job(job_data)
    fetched_job = await crud.fetch_job_by_uuid(created_job.uuid, owner_uuid)
    job = await crud.fetch_job_by_uuid(created_job.uuid, owner_uuid)

    assert fetched_job is not None
    assert job is not None

    print(job.llm_config)
    # FIX: Does not currently return JobRead but raw data: should be fixed
    # assert isinstance(job, JobRead)
    assert job.project_uuid == job_data.project_uuid
    assert job.llm_config["model_name"] == job_data.llm_config.model_name
    assert (
        job.llm_config["model_parameters"]["temperature"]
        == job_data.llm_config.model_parameters["temperature"]
    )
    # assert job.llm_config["model_parameters"]["seed"] == job_data.llm_config.model_parameters["seed"]
    assert (
        job.llm_config["model_parameters"]["top_p"]
        == job_data.llm_config.model_parameters["top_p"]
    )


@pytest.mark.asyncio
async def test_fetch_jobs_by_project(db_ctx):
    project_uuid, owner_uuid = await _create_owned_project(
        db_ctx, "test-fetch-jobs-by-project-owner"
    )

    crud = db_ctx.crud(JobCrud)
    for i in range(1, 11):
        job_data = _make_job_create(
            project_uuid,
            owner_uuid,
            model_name=f"project-test-model {i}",
            model_parameters={"temperature": 0.5, "top_p": 0.9},
        )
        await crud.create_job(job_data)

    jobs = await crud.fetch_jobs_by_project(project_uuid, owner_uuid)

    assert jobs is not None
    assert len(jobs) == 10
    for job in jobs:
        assert job.project_uuid == project_uuid
