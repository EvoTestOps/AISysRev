import pytest
from random import random
from src.crud.project_crud import ProjectCrud
from src.schemas.project import ProjectCreate
from src.crud.job_crud import JobCrud
from src.models.job import Job
from src.schemas.job import JobCreate, JobRead, ModelConfig

@pytest.mark.asyncio
async def test_fetch_jobs(db_session):
    crud = ProjectCrud(db_session)
    project_data = ProjectCreate(
        name="Project for Job Test",
        inclusion_criteria="A",
        exclusion_criteria="B"
    )
    id, project_uuid = await crud.create_project(project_data)
    assert project_uuid
    crud = JobCrud(db_session)
    for i in range(1, 6):
        job_data = JobCreate(
            project_uuid=project_uuid,
            llm_config=ModelConfig(
                model_name=f"test-model {i}",
                temperature=0.5,
                seed=42,
                top_p=0.9
            )
        )
        await crud.create_job(job_data)
    jobs = await crud.fetch_jobs()
    assert jobs is not None
    assert len(jobs) == 5

@pytest.mark.asyncio
async def test_create_and_fetch_job_crud(db_session):
    crud = ProjectCrud(db_session)
    project_data = ProjectCreate(
        name="Project for Job Test",
        inclusion_criteria="A",
        exclusion_criteria="B"
    )
    id, project_uuid = await crud.create_project(project_data)
    assert project_uuid
    crud = JobCrud(db_session)
    job_data = JobCreate(
        project_uuid=project_uuid,
        llm_config=ModelConfig(
            model_name="test-model",
            temperature=round(random(), 1),
            seed=42,
            top_p=round(random(), 1)
        )
    )
    created_job = await crud.create_job(job_data)
    fetched_job = await crud.fetch_job_by_uuid(created_job.uuid)
    job = JobRead(**fetched_job)
    assert fetched_job is not None
    assert isinstance(job, JobRead)
    assert job.project_uuid == job_data.project_uuid
    assert job.llm_config.model_name == job_data.llm_config.model_name
    assert job.llm_config.temperature == job_data.llm_config.temperature
    assert job.llm_config.seed == job_data.llm_config.seed
    assert job.llm_config.top_p == job_data.llm_config.top_p
