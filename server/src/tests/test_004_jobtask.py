import pytest
from unittest.mock import MagicMock, call, patch, AsyncMock
from src.crud.file_crud import FileCrud
from src.crud.job_crud import JobCrud
from src.crud.jobtask_crud import JobTaskCrud
from src.services.file_service import FileService
from src.services.job_service import JobService
from src.services.jobtask_service import JobTaskService
from src.schemas.job import JobCreate, JobRead, ModelConfig
from src.schemas.jobtask import JobTaskCreate, JobTaskStatus
from src.tasks.job_processing import async_process_job

@pytest.mark.asyncio
async def test_create_jobtask(db_session, test_project_uuid, test_files_working):
    file_crud = FileCrud(db_session)
    jobtask_crud = JobTaskCrud(db_session)
    file_service = FileService(db_session, file_crud)
    jobtask_service = JobTaskService(db_session, jobtask_crud)
    job_crud = JobCrud(db_session)
    job_service = JobService(db_session, file_service, jobtask_service, job_crud)

    await file_service.process_files(test_project_uuid, test_files_working)

    job_data = JobCreate(
        project_uuid=test_project_uuid,
        llm_config=ModelConfig(
            model_name="test-model",
            temperature=0.2,
            seed=42,
            top_p=0.9
        )
    )

    new_job = await job_service.create(job_data)
    assert new_job is not None
    assert isinstance(new_job, JobRead)
    assert new_job.project_uuid == test_project_uuid

    job_tasks = await jobtask_crud.fetch_job_tasks_by_job_uuid(new_job.uuid)
    assert job_tasks is not None
    assert len(job_tasks) == 2

@pytest.mark.asyncio
async def test_create_job_transaction_rollback(
    db_session,
    test_project_uuid,
    test_files_working,
    monkeypatch
):
    file_crud = FileCrud(db_session)
    jobtask_crud = JobTaskCrud(db_session)
    file_service = FileService(db_session, file_crud)
    jobtask_service = JobTaskService(db_session, jobtask_crud)
    job_crud = JobCrud(db_session)
    service = JobService(db_session, file_service, jobtask_service, job_crud)

    await file_service.process_files(test_project_uuid, test_files_working)

    async def fail_bulk_create(*args, **kwargs):
        raise Exception("Simulated failure")
    monkeypatch.setattr(jobtask_service, "bulk_create", fail_bulk_create)

    job_data = JobCreate(
        project_uuid=test_project_uuid,
        llm_config=ModelConfig(
            model_name="test-model",
            temperature=0.2,
            seed=42,
            top_p=0.9
        )
    )

    with pytest.raises(Exception, match="Simulated failure"):
        await service.create(job_data)

    jobs = await job_crud.fetch_jobs()
    assert len(jobs) == 0

@pytest.mark.asyncio
async def test_async_process_job(db_session, test_job_data):
    job_crud = JobCrud(db_session)
    job = await job_crud.create_job(test_job_data)

    jobtask_crud = JobTaskCrud(db_session)
    jobtasks = [
        JobTaskCreate(
            job_id=job.id,
            doi=f"10.1234/mock{i}",
            title=f"Mock Title {i}",
            abstract=f"Mock Abstract {i}",
            status=JobTaskStatus.NOT_STARTED
        )
        for i in range(1, 3)
    ]
    await jobtask_crud.bulk_create_jobtasks(jobtasks)
    await db_session.commit()

    celery_task = MagicMock()
    celery_task.update_state = MagicMock()

    await async_process_job(celery_task, job.id, test_job_data)

    calls = [
        call(state="PROGRESS", meta={"current": 1, "total": 2}),
        call(state="PROGRESS", meta={"current": 2, "total": 2}),
    ]

    celery_task.update_state.assert_has_calls(calls, any_order=True)

@pytest.mark.asyncio
async def test_async_process_job_failure(db_session, test_job_data, monkeypatch):
    job_crud = JobCrud(db_session)
    job = await job_crud.create_job(test_job_data)

    jobtask_crud = JobTaskCrud(db_session)
    jobtasks = [
        JobTaskCreate(
            job_id=job.id,
            doi=f"10.1234/mock{i}",
            title=f"Mock Title {i}",
            abstract=f"Mock Abstract {i}",
            status=JobTaskStatus.NOT_STARTED
        )
        for i in range(1, 3)
    ]
    await jobtask_crud.bulk_create_jobtasks(jobtasks)
    await db_session.commit()

    celery_task = MagicMock()
    celery_task.update_state = MagicMock()

    call_count = {"count": 0}
    async def fail_on_second_call(*args, **kwargs):
        call_count["count"] += 1
        if call_count["count"] == 2:
            raise Exception("Simulated failure")
        return None

    monkeypatch.setattr(
        "src.crud.jobtask_crud.JobTaskCrud.update_job_task_status",
        fail_on_second_call
    )

    with pytest.raises(Exception, match="Simulated failure"):
        await async_process_job(celery_task, job.id, test_job_data)

    calls = [
        call(state='PROGRESS', meta={'current': 1, 'total': 2}),
        call(state="FAILURE", meta={"error": "Simulated failure"}),
    ]

    celery_task.update_state.assert_has_calls(calls, any_order=False)
