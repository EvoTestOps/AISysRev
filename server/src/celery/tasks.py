import asyncio
import logging
import json
from src.event_queue import EventName, QueueItem
from src.redis.client import get_redis_client
from src.worker import celery_app
from src.db.session import AsyncSessionLocal
from src.schemas.job import JobCreate
from src.schemas.jobtask import JobTaskStatus
from src.crud.project_crud import ProjectCrud
from src.crud.jobtask_crud import JobTaskCrud
from src.tools.llm_decision_creator import get_structured_response

logger = logging.getLogger(__name__)

redis = get_redis_client()


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


async def async_process_job(
    celery_task: asyncio.Task, job_id: int, job_data: JobCreate
):
    logger.info("async_process_job: Starting to process job %s", job_id)
    async with AsyncSessionLocal() as db:
        project_crud = ProjectCrud(db)
        jobtask_crud = JobTaskCrud(db)

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
                redis.publish(
                    "job_task",
                    json.dumps(
                        QueueItem(
                            event_name=EventName.JOB_TASK_RUNNING,
                            value={
                                "job_task_id": job_task.id,
                                "status": JobTaskStatus.RUNNING,
                            },
                        )
                    ),
                )

                celery_task.update_state(
                    state="PROGRESS",
                    meta={"current": i + 1, "total": len(job_tasks)},
                )

                redis.publish(
                    "job_task",
                    json.dumps(
                        QueueItem(
                            event_name=EventName.JOB_TASK_RUNNING,
                            value={
                                "job_task_id": job_task.id,
                                "status": JobTaskStatus.RUNNING,
                                "current": i + 1,
                                "total": len(job_tasks),
                            },
                        )
                    ),
                )

                llm_result = await get_structured_response(db,
                    job_task, job_data, project.criteria
                )
                await jobtask_crud.update_job_task_result(
                    job_task.id, llm_result.model_dump_json()
                )
                await jobtask_crud.update_job_task_result(job_task.id, llm_result)
                print(job_task.result)

                logger.info("Updating job task status to %s", JobTaskStatus.DONE)
                await jobtask_crud.update_job_task_status(
                    job_task.id, JobTaskStatus.DONE
                )
                redis.publish(
                    "job_task",
                    json.dumps(
                        QueueItem(
                            event_name=EventName.JOB_TASK_DONE,
                            value={
                                "job_task_id": job_task.id,
                                "status": JobTaskStatus.DONE,
                            },
                        )
                    ),
                )

            except Exception as e:
                logger.info("Updating job task status to %s", JobTaskStatus.ERROR)
                await jobtask_crud.update_job_task_status(
                    job_task.id, JobTaskStatus.ERROR
                )
                redis.publish(
                    "job_task",
                    json.dumps(
                        QueueItem(
                            event_name=EventName.JOB_TASK_ERROR,
                            value={
                                "job_task_id": job_task.id,
                                "status": JobTaskStatus.ERROR,
                                "message": str(e),
                            },
                        )
                    ),
                )
                celery_task.update_state(
                    state="FAILURE",
                    meta={"error": str(e)},
                )
                logger.error(e)
                raise

        return {"result": "all job tasks processed"}
