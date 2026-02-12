import asyncio
import logging
import random
from typing import Dict

from celery import Task
from src.crud.jobtask_crud import JobTaskCrud
from src.crud.project_crud import ProjectCrud
from src.db.db_context import DBContext
from src.event_queue import EventName, QueueItem
from src.helpers.resolve_job_status import resolve_job_status
from src.redis_client.client import REDIS_CHANNEL, get_redis_client
from src.schemas.job import JobCreate
from src.schemas.jobtask import JobTaskStatus
from src.schemas.project import Criteria
from src.services.llm_service import create_llm_service
from src.services.paper_service import create_paper_service
from src.tools.llm_decision_creator import get_structured_response
from src.worker import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="tasks.test_task")
def test_task(name: str):
    import time

    print(f"Task started for {name}")
    time.sleep(3)
    print(f"Task done for {name}")
    return f"Hello, {name}!"


@celery_app.task(name="tasks.process_job", bind=True)
def process_job_task(self: Task, job_id: int, job_data: dict):
    job_data_unpacked = JobCreate.model_validate(job_data, strict=True)
    logger.info("Running job task using asyncio, ID: %s", job_id)
    asyncio.run(process_job(self, job_id, job_data_unpacked))


async def _publish_redis_event(redis, event_name, value):
    await redis.publish(
        REDIS_CHANNEL, QueueItem(event_name=event_name, value=value).model_dump_json()
    )


async def _run_with_retry(
    func, max_retries: int = 3, base_delay: float = 1.0, jitter: float = 0.3
):
    retries = 0
    while True:
        try:
            return await func()
        except Exception as e:
            retries += 1
            if retries > max_retries:
                raise

            delay = base_delay * (2 ** (retries - 1))

            jitter_amount = delay * jitter
            delay = delay + random.uniform(-jitter_amount, jitter_amount)

            logger.warning(
                f"Retrying job task (attempt {retries}/{max_retries}) - Error: {e}"
            )

            await asyncio.sleep(delay)


async def _process_job_task(
    celery_task: Task,
    job_task_id: int,
    job_id: int,
    job_data: JobCreate,
    project_criteria: Criteria,
    semaphore: asyncio.Semaphore,
    redis,
    counter: Dict[str, int],
    counter_lock: asyncio.Lock,
    max_retries: int,
):
    async with semaphore:
        try:
            async with DBContext() as task_db_ctx:
                jobtask_crud = task_db_ctx.crud(JobTaskCrud)
                job_task = await jobtask_crud.fetch_job_task_by_id(job_task_id)

                llm_service = create_llm_service(task_db_ctx)
                paper_service = create_paper_service(task_db_ctx)

                await jobtask_crud.update_job_task_status(
                    job_task.id, JobTaskStatus.RUNNING
                )
                await task_db_ctx.commit()

                await _publish_redis_event(
                    redis,
                    EventName.JOB_TASK_RUNNING,
                    {"job_task_id": job_task.id, "status": JobTaskStatus.RUNNING},
                )

                llm_result = await _run_with_retry(
                    lambda: get_structured_response(
                        llm_service,
                        paper_service,
                        job_task,
                        job_data,
                        project_criteria,
                    ),
                    max_retries=max_retries,
                )

                await jobtask_crud.update_job_task_result(job_task.id, llm_result)
                await jobtask_crud.update_job_task_status(
                    job_task.id, JobTaskStatus.DONE
                )
                await task_db_ctx.commit()

                async with counter_lock:
                    counter["success"] += 1

                await _publish_redis_event(
                    redis,
                    EventName.JOB_TASK_DONE,
                    {"job_task_id": job_task.id, "status": JobTaskStatus.DONE},
                )

        except Exception as e:
            try:
                async with DBContext() as task_err_db_ctx:
                    err_jobtask_crud = task_err_db_ctx.crud(JobTaskCrud)
                    await err_jobtask_crud.update_job_task_status(
                        job_task_id, JobTaskStatus.ERROR
                    )
                    await err_jobtask_crud.update_job_task_error(job_task_id, str(e))
                    await task_err_db_ctx.commit()

                    async with counter_lock:
                        counter["failed"] += 1

            except Exception as err_db_exc:
                logger.exception(
                    "Failed to write error to database for job_task %s: %s",
                    job_task_id,
                    err_db_exc,
                )

            try:
                await _publish_redis_event(
                    redis,
                    EventName.JOB_TASK_ERROR,
                    {
                        "job_task_id": job_task_id,
                        "status": JobTaskStatus.ERROR,
                        "message": str(e),
                    },
                )
            except Exception:
                logger.exception("Failed to publish error %s", job_task_id)

            try:
                celery_task.update_state(state="FAILURE", meta={"error": str(e)})
            except Exception:
                logger.exception(
                    "Failed to update celery state for job_task %s", job_task_id
                )
        finally:
            async with counter_lock:
                counter["completed"] += 1
                completed = counter["completed"]
                total = counter["total"]
                success = counter["success"]
                failed = counter["failed"]

                status = resolve_job_status(total, success, failed)

                # TODO: maybe buffer to avoid spamming
                await _publish_redis_event(
                    redis,
                    EventName.JOB_PROGRESS,
                    {
                        "job_id": job_id,
                        "stats": {
                            "total": total,
                            "success": success,
                            "failed": failed,
                            "status": status,
                        },
                    },
                )

                try:
                    celery_task.update_state(
                        state="PROGRESS", meta={"current": completed, "total": total}
                    )
                except Exception:
                    logger.exception("Failed to update celery progress counter")


async def process_job(
    celery_task: Task,
    job_id: int,
    job_data: JobCreate,
    max_concurrent_tasks: int = 20,
    max_retries: int = 3,
):
    logger.info("process_job: Starting to process job %s", job_id)
    redis = get_redis_client()

    async with DBContext() as db_ctx:
        project_crud = db_ctx.crud(ProjectCrud)
        jobtask_crud = db_ctx.crud(JobTaskCrud)

        logger.info("Fetching project by UUID %s", job_data.project_uuid)
        project = await project_crud.fetch_project_by_uuid(job_data.project_uuid)
        if project is None:
            raise RuntimeError("Project not found")

        project_criteria = project.criteria

        logger.info("Updating job task status to %s", JobTaskStatus.PENDING)
        await jobtask_crud.update_job_tasks_status(job_id, JobTaskStatus.PENDING)
        await db_ctx.commit()

        job_tasks = await jobtask_crud.fetch_job_tasks_by_job_id(job_id)
        job_task_ids = [jt.id for jt in job_tasks]

    semaphore = asyncio.Semaphore(max_concurrent_tasks)
    counter_lock = asyncio.Lock()
    counter = {"completed": 0, "success": 0, "failed": 0, "total": len(job_task_ids)}

    tasks = [
        _process_job_task(
            celery_task=celery_task,
            job_task_id=jt_id,
            job_id=job_id,
            job_data=job_data,
            project_criteria=project_criteria,
            semaphore=semaphore,
            redis=redis,
            counter=counter,
            counter_lock=counter_lock,
            max_retries=max_retries,
        )
        for jt_id in job_task_ids
    ]

    await asyncio.gather(*tasks)

    return {"result": "all job tasks processed"}
