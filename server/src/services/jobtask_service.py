import json
from uuid import UUID
from src.celery.tasks import process_job_task
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.session import get_db
from src.schemas.jobtask import JobTaskCreate, JobTaskHumanResult, JobTaskRead
from src.crud.jobtask_crud import JobTaskCrud
import logging

logger = logging.getLogger(__name__)


class JobTaskService:
    def __init__(self, db: AsyncSession, jobtask_crud: JobTaskCrud):
        self.db = db
        self.jobtask_crud = jobtask_crud

    async def fetch_job_tasks(self, job_uuid: UUID):
        job_tasks = await self.jobtask_crud.fetch_job_tasks_by_job_uuid(job_uuid)

        return [JobTaskRead(
            uuid=task.uuid,
            job_uuid=job_uuid,
            doi=task.doi,
            title=task.title,
            abstract=task.abstract,
            status=task.status,
            result=task.result,
            human_result=task.human_result,
            status_metadata=task.status_metadata
        ) for task in job_tasks]
    
    async def add_human_result(self, uuid: UUID, human_result: JobTaskHumanResult):
        await self.jobtask_crud.add_jobtask_human_result(uuid, human_result)

    async def bulk_create(self, job_id: UUID, papers: list[dict]):
        jobtasks = [
            JobTaskCreate(
                job_id=job_id,
                doi=paper["doi"],
                title=paper["title"],
                abstract=paper["abstract"],
            )
            for paper in papers
        ]
        return await self.jobtask_crud.bulk_create_jobtasks(jobtasks)

    async def start_job_tasks(self, job_id: int, job_data: dict):
        # job_data is of type JobCreate
        logger.info("start_job_tasks: Processing job %s", job_id)
        return process_job_task.delay(job_id, job_data)

def get_jobtask_service(db: AsyncSession = Depends(get_db)) -> JobTaskService:
    jobtask_crud = JobTaskCrud(db)
    return JobTaskService(db, jobtask_crud)