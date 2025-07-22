import asyncio
from src.worker import celery_app
from src.db.session import AsyncSessionLocal
from src.schemas.jobtask import JobTaskStatus
from src.crud.jobtask_crud import JobTaskCrud


@celery_app.task(name="tasks.process_job", bind=True)
def process_job_task(self, job_id: int):
    print(f"Processing job with ID: {job_id}")
    return asyncio.run(async_process_job(self, job_id))

async def async_process_job(celery_task, job_id: int):
    async with AsyncSessionLocal() as db:
        jobtask_crud = JobTaskCrud(db)
        await jobtask_crud.update_job_tasks_status(job_id, JobTaskStatus.PENDING)
        job_tasks = await jobtask_crud.fetch_job_tasks_by_job_id(job_id)

        for i, job_task in enumerate(job_tasks):
            try:
                await jobtask_crud.update_job_task_status(job_task.id, JobTaskStatus.RUNNING)
                celery_task.update_state(
                    state="PROGRESS",
                    meta={"current": i + 1, "total": len(job_tasks)},
                )
                await asyncio.sleep(1)
                await jobtask_crud.update_job_task_status(job_task.id, JobTaskStatus.DONE)
            except Exception as e:
                await jobtask_crud.update_job_task_status(job_task.id, JobTaskStatus.ERROR)
                celery_task.update_state(
                    state="FAILURE",
                    meta={"error": str(e)},
                )
                raise
        return {"result": "all job tasks processed"}

        