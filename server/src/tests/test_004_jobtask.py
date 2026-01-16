from unittest.mock import AsyncMock, MagicMock, call, patch

import pytest

from src.celery.tasks import process_job
from src.crud.file_crud import FileCrud
from src.crud.job_crud import JobCrud
from src.crud.jobtask_crud import JobTaskCrud
from src.crud.paper_crud import PaperCrud
from src.db.db_context import DBContext
from src.schemas.file import FileCreate
from src.schemas.job import (
    JobCreate,
    JobRead,
    LLMModelConfig,
    ZeroShotPromptingConfig,
)
from src.schemas.jobtask import JobTaskCreate, JobTaskStatus
from src.schemas.paper import PaperCreate
from src.services.file_service import create_file_service
from src.services.job_service import create_job_service


@pytest.mark.asyncio
async def test_create_jobtask(db_ctx, test_project_uuid, test_files_working):
    file_service = create_file_service(db_ctx)
    jobtask_crud = db_ctx.crud(JobTaskCrud)
    job_service = create_job_service(db_ctx)

    await file_service.process_files(test_project_uuid, [test_files_working[0]])

    job_data = JobCreate(
        project_uuid=test_project_uuid,
        llm_config=LLMModelConfig(
            model_name="test-model",
            model_parameters={"temperature": 0, "top_p": 0.1},
            provider_name="Test provider",
            provider_parameters={},
        ),
        prompting_config=ZeroShotPromptingConfig(),
    )

    new_job = await job_service.create(job_data)

    assert new_job is not None
    assert isinstance(new_job, JobRead)
    assert new_job.project_uuid == test_project_uuid

    job_tasks = await jobtask_crud.fetch_job_tasks_by_job_uuid(new_job.uuid)
    assert job_tasks is not None
    assert len(job_tasks) == 1


@pytest.mark.asyncio
async def test_create_job_transaction_rollback(
    db_ctx, test_project_uuid, test_files_working, monkeypatch
):
    job_service = create_job_service(db_ctx)
    job_crud = db_ctx.crud(JobCrud)
    file_service = create_file_service(db_ctx)

    await file_service.process_files(test_project_uuid, [test_files_working[0]])

    async def fail_bulk_create(*args, **kwargs):
        raise Exception("Simulated failure")

    monkeypatch.setattr(job_service.jobtask_service, "bulk_create", fail_bulk_create)

    job_data = JobCreate(
        project_uuid=test_project_uuid,
        llm_config=LLMModelConfig(
            model_name="test-model",
            model_parameters={"temperature": 0, "top_p": 0.1},
            provider_name="Test provider",
            provider_parameters={},
        ),
        prompting_config=ZeroShotPromptingConfig(),
    )

    with pytest.raises(Exception, match="Simulated failure"):
        # TODO: job_service doesn't control the transaction any more so need to manually nest
        # the transaction. Should be checked what the route expects to happen and nest also there.
        async with db_ctx.nested():
            await job_service.create(job_data)

    jobs = await job_crud.fetch_jobs()
    assert len(jobs) == 0


# TODO: Run seperately or refactor test setup (and teardown) for tests that deal with task running.
# The functions tested commit to db which leads to inconsistent db state for other tests.
@pytest.mark.asyncio
@patch("src.celery.tasks.get_structured_response", new_callable=AsyncMock)
@pytest.mark.skip(reason="Should be moved to somewhere else since commits to db")
async def test_async_process_job(
    mock_get_structured_response, test_job_data, test_structured_response
):

    async with DBContext() as db_ctx:
        job_crud = db_ctx.crud(JobCrud)
        jobtask_crud = db_ctx.crud(JobTaskCrud)
        paper_crud = db_ctx.crud(PaperCrud)
        file_crud = db_ctx.crud(FileCrud)

        mock_get_structured_response.return_value = test_structured_response

        file_obj = await file_crud.create_file_record(
            FileCreate(
                project_uuid=test_job_data.project_uuid,
                filename="mock.csv",
                mime_type="text/csv",
            )
        )

        papers = await paper_crud.bulk_create_papers(
            [
                PaperCreate(
                    project_uuid=test_job_data.project_uuid,
                    file_uuid=file_obj.uuid,
                    title=f"Mock Paper {i}",
                    abstract=f"Mock Abstract {i}",
                    doi=f"10.1234/mock{i}",
                    paper_id=i,
                )
                for i in range(1, 3)
            ]
        )

        job = await job_crud.create_job(test_job_data)

        jobtasks = [
            JobTaskCreate(
                job_id=job.id,
                doi=paper.doi,
                title=paper.title,
                abstract=paper.abstract,
                status=JobTaskStatus.NOT_STARTED,
                paper_uuid=paper.uuid,
            )
            for paper in papers
        ]

        await jobtask_crud.bulk_create_jobtasks(jobtasks)
        await db_ctx.commit()

    celery_task = MagicMock()
    celery_task.update_state = MagicMock()

    await process_job(celery_task, job.id, test_job_data, db_ctx=None)

    calls = celery_task.update_state.call_args_list
    progress_calls = [c for c in calls if c[1].get("state") == "PROGRESS"]

    assert len(progress_calls) == 2

    async with DBContext() as db_ctx:
        jobtask_crud = db_ctx.crud(JobTaskCrud)
        tasks = await jobtask_crud.fetch_job_tasks_by_job_id(job.id)
        for t in tasks:
            assert t.status.value == JobTaskStatus.DONE.value
            assert t.result is not None


@pytest.mark.asyncio
@pytest.mark.skip(reason="Should be moved to somewhere else since commits to db")
@patch("src.celery.tasks.get_structured_response", new_callable=AsyncMock)
async def test_async_process_job_failure(
    mock_get_structured_response, test_job_data, test_structured_response
):
    async with DBContext() as db_ctx:
        job_crud = db_ctx.crud(JobCrud)
        jobtask_crud = db_ctx.crud(JobTaskCrud)
        paper_crud = db_ctx.crud(PaperCrud)
        file_crud = db_ctx.crud(FileCrud)

        mock_get_structured_response.return_value = test_structured_response

        file_obj = await file_crud.create_file_record(
            FileCreate(
                project_uuid=test_job_data.project_uuid,
                filename="mock.csv",
                mime_type="text/csv",
            )
        )

        papers = await paper_crud.bulk_create_papers(
            [
                PaperCreate(
                    project_uuid=test_job_data.project_uuid,
                    file_uuid=file_obj.uuid,
                    title=f"Mock Paper {i}",
                    abstract=f"Mock Abstract {i}",
                    doi=f"10.1234/mock{i}",
                    paper_id=i,
                )
                for i in range(1, 3)
            ]
        )

        job = await job_crud.create_job(test_job_data)

        jobtasks = [
            JobTaskCreate(
                job_id=job.id,
                doi=paper.doi,
                title=paper.title,
                abstract=paper.abstract,
                status=JobTaskStatus.NOT_STARTED,
                paper_uuid=paper.uuid,
            )
            for paper in papers
        ]

        await jobtask_crud.bulk_create_jobtasks(jobtasks)
        await db_ctx.commit()

    celery_task = MagicMock()
    celery_task.update_state = MagicMock()

    call_count = {"count": 0}

    async def fail_on_second_call(*args, **kwargs):
        call_count["count"] += 1
        if call_count["count"] == 2:
            raise Exception("Simulated failure")
        return test_structured_response

    mock_get_structured_response.side_effect = fail_on_second_call

    # Would retry task if max_retries=0 wasn't set
    await process_job(celery_task, job.id, test_job_data, db_ctx=None, max_retries=0)

    calls = celery_task.update_state.call_args_list
    progress_calls = [c for c in calls if c[1].get("state") == "PROGRESS"]

    assert len(progress_calls) == 2

    async with DBContext() as db_ctx:
        jobtask_crud = db_ctx.crud(JobTaskCrud)
        tasks = await jobtask_crud.fetch_job_tasks_by_job_id(job.id)

        print(tasks[0].error)
        print(tasks[1].error)
        done_count = sum(1 for t in tasks if t.status.value == JobTaskStatus.DONE.value)
        error_count = sum(
            1 for t in tasks if t.status.value == JobTaskStatus.ERROR.value
        )

        assert done_count == 1
        assert error_count == 1
