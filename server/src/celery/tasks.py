import asyncio
import logging

from src.crud.jobtask_crud import JobTaskCrud
from src.crud.project_crud import ProjectCrud
from src.db.db_context import DBContext
from src.schemas.job import JobCreate
from src.schemas.jobtask import JobTaskStatus
from src.services.openrouter_service import create_openrouter_service
from src.services.paper_service import create_paper_service
from src.tools.llm_decision_creator import get_structured_response
from src.worker import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="tasks.process_job", bind=True)
def process_job_task(self: asyncio.Task, job_id: int, job_data: dict):
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
    celery_task: asyncio.Task, job_id: int, job_data: JobCreate
):
    logger.info("async_process_job: Starting to process job %s", job_id)
    # TODO: Does not currently show statuses in realtime to front since results are commited
    #   only once in the end.
    async with DBContext() as db_ctx:

        project_crud = db_ctx.crud(ProjectCrud)
        jobtask_crud = db_ctx.crud(JobTaskCrud)
        openrouter_service = create_openrouter_service(db_ctx)
        paper_service = create_paper_service(db_ctx)

        logger.info("Fetching project by UUID %s", job_data.project_uuid)
        project = await project_crud.fetch_project_by_uuid(job_data.project_uuid)

        logger.info("Updating job task status to %s", JobTaskStatus.PENDING)
        await jobtask_crud.update_job_tasks_status(job_id, JobTaskStatus.PENDING)
        job_tasks = await jobtask_crud.fetch_job_tasks_by_job_id(job_id)

        for i, job_task in enumerate(job_tasks):
            try:
                await jobtask_crud.update_job_task_status(
                    job_task.id, JobTaskStatus.RUNNING
                )
                celery_task.update_state(
                    state="PROGRESS",
                    meta={"current": i + 1, "total": len(job_tasks)},
                )
                llm_result = await _async_retry_job_task(
                    lambda: get_structured_response(
                        openrouter_service,
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
            except Exception as e:
                logger.info("Updating job task status to %s", JobTaskStatus.ERROR)
                await jobtask_crud.update_job_task_status(
                    job_task.id, JobTaskStatus.ERROR
                )
                await jobtask_crud.update_job_task_error(job_task.id, str(e))

                logger.error(e)
                continue

        await db_ctx.commit()

        return {"result": "all job tasks processed"}
