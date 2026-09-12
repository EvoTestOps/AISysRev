from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID

import pytest

from src.celery.tasks import process_job
from src.crud.file_crud import FileCrud
from src.crud.job_crud import JobCrud
from src.crud.jobtask_crud import JobTaskCrud
from src.crud.paper_crud import PaperCrud
from src.crud.project_crud import ProjectCrud
from src.crud.user_crud import UserCrud
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
from src.schemas.project import Criteria, ProjectCreate
from src.schemas.user import UserCreate
from src.services.file_service import create_file_service
from src.services.job_service import create_job_service


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
async def test_create_jobtask(db_ctx, test_files_working):
    project_uuid, owner_uuid = await _create_owned_project(
        db_ctx, "test-create-jobtask-owner"
    )

    file_service = create_file_service(db_ctx)
    jobtask_crud = db_ctx.crud(JobTaskCrud)
    job_service = create_job_service(db_ctx)

    await file_service.process_files(project_uuid, [test_files_working[0]], owner_uuid)

    job_data = _make_job_create(project_uuid, owner_uuid)

    new_job = await job_service.create(job_data)

    assert new_job is not None
    assert isinstance(new_job, JobRead)
    assert new_job.project_uuid == project_uuid

    job_tasks = await jobtask_crud.fetch_job_tasks_by_job_uuid(new_job.uuid, owner_uuid)
    assert job_tasks is not None
    assert len(job_tasks) == 1


@pytest.mark.asyncio
async def test_create_job_transaction_rollback(db_ctx, test_files_working, monkeypatch):
    project_uuid, owner_uuid = await _create_owned_project(
        db_ctx, "test-job-transaction-rollback-owner"
    )

    job_service = create_job_service(db_ctx)
    job_crud = db_ctx.crud(JobCrud)
    file_service = create_file_service(db_ctx)

    await file_service.process_files(project_uuid, [test_files_working[0]], owner_uuid)

    async def fail_bulk_create(*args, **kwargs):
        raise Exception("Simulated failure")

    monkeypatch.setattr(job_service.jobtask_service, "bulk_create", fail_bulk_create)

    job_data = _make_job_create(project_uuid, owner_uuid)

    with pytest.raises(Exception, match="Simulated failure"):
        # TODO: job_service doesn't control the transaction any more so need to manually nest
        # the transaction. Should be checked what the route expects to happen and nest also there.
        async with db_ctx.nested():
            await job_service.create(job_data)

    jobs = await job_crud.fetch_jobs(owner_uuid)
    assert len(jobs) == 0


@pytest.mark.asyncio
@patch("src.celery.tasks.get_structured_response", new_callable=AsyncMock)
async def test_async_process_job(
    mock_get_structured_response, committing_db, test_job_data, test_structured_response
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

    await process_job(celery_task, job.id, test_job_data, update_interval=1)

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
@patch("src.celery.tasks.get_structured_response", new_callable=AsyncMock)
async def test_async_process_job_failure(
    mock_get_structured_response, committing_db, test_job_data, test_structured_response
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
    await process_job(
        celery_task, job.id, test_job_data, max_retries=0, update_interval=1
    )

    calls = celery_task.update_state.call_args_list
    progress_calls = [c for c in calls if c[1].get("state") == "PROGRESS"]

    assert len(progress_calls) == 2

    async with DBContext() as db_ctx:
        jobtask_crud = db_ctx.crud(JobTaskCrud)
        tasks = await jobtask_crud.fetch_job_tasks_by_job_id(job.id)

        done_count = sum(1 for t in tasks if t.status.value == JobTaskStatus.DONE.value)
        error_count = sum(
            1 for t in tasks if t.status.value == JobTaskStatus.ERROR.value
        )

        assert done_count == 1
        assert error_count == 1
