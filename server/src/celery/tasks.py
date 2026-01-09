import asyncio
import logging
from contextlib import nullcontext

from celery import Task
from src.crud.jobtask_crud import JobTaskCrud
from src.crud.project_crud import ProjectCrud
from src.db.db_context import DBContext
from src.event_queue import EventName, QueueItem
from src.redis_client.client import REDIS_CHANNEL, get_redis_client
from src.schemas.job import JobCreate
from src.schemas.jobtask import JobTaskStatus
from src.services.llm_service import create_llm_service
from src.services.paper_service import create_paper_service
from src.tools.llm_decision_creator import get_structured_response
from src.worker import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="tasks.process_job", bind=True)
def process_job_task(self: Task, job_id: int, job_data: dict):
    job_data_unpacked = JobCreate.model_validate(job_data, strict=True)
    logger.info("Running job task using asyncio, ID: %s", job_id)
    asyncio.run(async_process_job(self, job_id, job_data_unpacked))


@celery_app.task(name="tasks.test_task")
def test_task(name: str):
    import time

    print(f"Task started for {name}")
    time.sleep(3)
    print(f"Task done for {name}")
    return f"Hello, {name}!"


async def _async_retry_job_task(func, max_retries=3, base_delay=1):
    retries = 0
    while True:
        try:
            return await func()
        except Exception as e:
            retries += 1
            logger.warning(
                f"Retrying job task (attempt {retries}/{max_retries}) - Error: {e}"
            )
            if retries > max_retries:
                raise e
            delay = base_delay * (2 ** (retries - 1))
            await asyncio.sleep(delay)


async def async_process_job(
    celery_task: Task,
    job_id: int,
    job_data: JobCreate,
    db_ctx: DBContext | None = None,
):
    logger.info("async_process_job: Starting to process job %s", job_id)
    redis = get_redis_client()

    # Check that who owns the session
    close_session = False
    if db_ctx is None:
        db_ctx = DBContext()
        close_session = True

    async with (
        db_ctx if close_session else nullcontext(db_ctx)
    ):  # Use nullcontext if session has been created
        project_crud = db_ctx.crud(ProjectCrud)
        jobtask_crud = db_ctx.crud(JobTaskCrud)
        llm_service = create_llm_service(db_ctx)
        paper_service = create_paper_service(db_ctx)

        logger.info("Fetching project by UUID %s", job_data.project_uuid)
        project = await project_crud.fetch_project_by_uuid(job_data.project_uuid)
        if project is None:
            raise RuntimeError("Project not found")

        logger.info("Updating job task status to %s", JobTaskStatus.PENDING)
        await jobtask_crud.update_job_tasks_status(job_id, JobTaskStatus.PENDING)
        await db_ctx.commit() if close_session else await db_ctx.session.flush()

        job_tasks = await jobtask_crud.fetch_job_tasks_by_job_id(job_id)

        for i, job_task in enumerate(job_tasks):
            try:
                await jobtask_crud.update_job_task_status(
                    job_task.id, JobTaskStatus.RUNNING
                )
                await db_ctx.commit() if close_session else await db_ctx.session.flush()
                await redis.publish(
                    REDIS_CHANNEL,
                    QueueItem(
                        event_name=EventName.JOB_TASK_RUNNING,
                        value={
                            "job_task_id": job_task.id,
                            "status": JobTaskStatus.RUNNING,
                            "current": i + 1,
                            "total": len(job_tasks),
                        },
                    ).model_dump_json(),
                )
                celery_task.update_state(
                    state="PROGRESS",
                    meta={"current": i + 1, "total": len(job_tasks)},
                )
                llm_result = await _async_retry_job_task(
                    lambda: get_structured_response(
                        llm_service,
                        paper_service,
                        job_task,
                        job_data,
                        project.criteria,
                    )
                )

                await jobtask_crud.update_job_task_result(job_task.id, llm_result)
                logger.info("Updating job task status to %s", JobTaskStatus.DONE)
                await jobtask_crud.update_job_task_status(
                    job_task.id, JobTaskStatus.DONE
                )
                await db_ctx.commit() if close_session else await db_ctx.session.flush()
                await redis.publish(
                    REDIS_CHANNEL,
                    QueueItem(
                        event_name=EventName.JOB_TASK_DONE,
                        value={
                            "job_task_id": job_task.id,
                            "status": JobTaskStatus.DONE,
                        },
                    ).model_dump_json(),
                )

            except Exception as e:
                logger.info("Updating job task status to %s", JobTaskStatus.ERROR)
                await jobtask_crud.update_job_task_status(
                    job_task.id, JobTaskStatus.ERROR
                )
                await jobtask_crud.update_job_task_error(job_task.id, str(e))

                await redis.publish(
                    REDIS_CHANNEL,
                    QueueItem(
                        event_name=EventName.JOB_TASK_ERROR,
                        value={
                            "job_task_id": job_task.id,
                            "status": JobTaskStatus.ERROR,
                            "message": str(e),
                        },
                    ).model_dump_json(),
                )

                celery_task.update_state(
                    state="FAILURE",
                    meta={"error": str(e)},
                )
                logger.error(e)
                await db_ctx.commit() if close_session else await db_ctx.session.flush()

                continue

        return {"result": "all job tasks processed"}
