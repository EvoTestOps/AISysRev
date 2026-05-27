import pytest

from src.crud.job_crud import JobCrud
from src.schemas.job import JobCreate, ZeroShotPromptingConfig, LLMModelConfig
from src.services.job_service import (
    JobService,
    create_job_service,
)


@pytest.mark.asyncio
async def test_fetch_jobs(db_ctx, test_job_data):
    crud = db_ctx.crud(JobCrud)

    for i in range(1, 6):
        await crud.create_job(test_job_data)

    jobs = await crud.fetch_jobs()

    assert jobs is not None
    assert len(jobs) == 5


@pytest.mark.asyncio
async def test_create_and_fetch_job_crud(db_ctx, test_job_data):
    crud = db_ctx.crud(JobCrud)

    created_job = await crud.create_job(test_job_data)
    fetched_job = await crud.fetch_job_by_uuid(created_job.uuid)
    job = await crud.fetch_job_by_uuid(created_job.uuid)

    assert fetched_job is not None
    assert job is not None

    print(job.llm_config)
    # FIX: Does not currently return JobRead but raw data: should be fixed
    # assert isinstance(job, JobRead)
    assert job.project_uuid == test_job_data.project_uuid
    assert job.llm_config["model_name"] == test_job_data.llm_config.model_name
    assert (
        job.llm_config["model_parameters"]["temperature"]
        == test_job_data.llm_config.model_parameters["temperature"]
    )
    # assert job.llm_config["model_parameters"]["seed"] == test_job_data.llm_config.model_parameters["seed"]
    assert (
        job.llm_config["model_parameters"]["top_p"]
        == test_job_data.llm_config.model_parameters["top_p"]
    )


@pytest.mark.asyncio
async def test_fetch_jobs_by_project(db_ctx, test_project_uuid, test_user_uuid):
    crud = db_ctx.crud(JobCrud)
    for i in range(1, 11):
        job_data = JobCreate(
            project_uuid=test_project_uuid,
            owner_uuid=test_user_uuid,
            prompting_config=ZeroShotPromptingConfig(),
            llm_config=LLMModelConfig(
                model_name=f"project-test-model {i}",
                provider_name="Test provider",
                provider_parameters={},
                model_parameters={
                    "temperature": 0.5,
                    "top_p": 0.9,
                },
            ),
        )
        await crud.create_job(job_data)

    jobs = await crud.fetch_jobs_by_project(test_project_uuid)

    assert jobs is not None
    assert len(jobs) == 10
    for job in jobs:
        assert job.project_uuid == test_project_uuid


@pytest.mark.asyncio
async def test_get_job_service(db_ctx):
    service = create_job_service(db_ctx)

    assert service is not None
    assert isinstance(service, JobService)
