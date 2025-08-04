import pytest
from src.crud.job_crud import JobCrud
from src.schemas.job import JobCreate, JobRead, ModelConfig
from src.services.job_service import JobService, get_job_service

@pytest.mark.asyncio
async def test_fetch_jobs(db_session, test_job_data):
    crud = JobCrud(db_session)
    for i in range(1, 6):
        await crud.create_job(test_job_data)
    jobs = await crud.fetch_jobs()
    assert jobs is not None
    assert len(jobs) == 5

@pytest.mark.asyncio
async def test_create_and_fetch_job_crud(db_session, test_job_data):
    crud = JobCrud(db_session)
    created_job = await crud.create_job(test_job_data)
    fetched_job = await crud.fetch_job_by_uuid(created_job.uuid)
    job = JobRead(**fetched_job)
    assert fetched_job is not None
    assert isinstance(job, JobRead)
    assert job.project_uuid == test_job_data.project_uuid
    assert job.llm_config.model_name == test_job_data.llm_config.model_name
    assert job.llm_config.temperature == test_job_data.llm_config.temperature
    assert job.llm_config.seed == test_job_data.llm_config.seed
    assert job.llm_config.top_p == test_job_data.llm_config.top_p

@pytest.mark.asyncio
async def test_fetch_jobs_by_project(db_session, test_project_uuid):
    crud = JobCrud(db_session)
    for i in range(1, 11):
        job_data = JobCreate(
            project_uuid=test_project_uuid,
            llm_config=ModelConfig(
                model_name=f"project-test-model {i}",
                temperature=0.5,
                seed=42,
                top_p=0.9
            )
        )
        await crud.create_job(job_data)
    jobs = await crud.fetch_jobs_by_project(test_project_uuid)
    assert jobs is not None
    assert len(jobs) == 10
    for job in jobs:
        assert job.project_uuid == test_project_uuid
    
@pytest.mark.asyncio
async def test_get_job_service(db_session):
    service = get_job_service(db_session)
    assert service is not None
    assert isinstance(service, JobService)
