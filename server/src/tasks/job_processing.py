import asyncio
from fastapi import APIRouter
from src.worker import celery_app
from src.db.session import AsyncSessionLocal
from src.schemas.job import JobRead
from src.schemas.jobtask import JobTaskStatus
from src.crud.project_crud import ProjectCrud
from src.crud.jobtask_crud import JobTaskCrud
from src.tools.llm_decision_creator import create_decision

router = APIRouter()

@celery_app.task(name="tasks.process_job", bind=True)
def process_job_task(self: asyncio.Task, job_id: int, job_data: dict):
    job = JobRead(**job_data)
    asyncio.run(async_process_job(self, job_id, job_data))

async def async_process_job(celery_task: asyncio.Task, job_id: int, job_data: JobRead):
    async with AsyncSessionLocal() as db:
        project_crud = ProjectCrud(db)
        jobtask_crud = JobTaskCrud(db)

        project = await project_crud.fetch_project_by_uuid(job_data.project_uuid)

        await jobtask_crud.update_job_tasks_status(job_id, JobTaskStatus.PENDING)
        job_tasks = await jobtask_crud.fetch_job_tasks_by_job_id(job_id)

        for i, job_task in enumerate(job_tasks):
            try:
                await jobtask_crud.update_job_task_status(job_task.id, JobTaskStatus.RUNNING)
                celery_task.update_state(
                    state="PROGRESS",
                    meta={"current": i + 1, "total": len(job_tasks)},
                )
                await create_decision(job_task, job_data, project.inclusion_criteria, project.exclusion_criteria)
                await jobtask_crud.update_job_task_status(job_task.id, JobTaskStatus.DONE)
            except Exception as e:
                await jobtask_crud.update_job_task_status(job_task.id, JobTaskStatus.ERROR)
                celery_task.update_state(
                    state="FAILURE",
                    meta={"error": str(e)},
                )
                raise

        return {"result": "all job tasks processed"}
