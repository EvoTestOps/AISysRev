from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from src.schemas.jobtask import JobTaskCreate
from src.crud.jobtask_crud import JobTaskCrud
from src.tasks.job_processing import process_job_task

class JobTaskService:
    def __init__(self, db: AsyncSession, jobtask_crud: JobTaskCrud):
        self.db = db
        self.jobtask_crud = jobtask_crud

    async def bulk_create(self, job_id: UUID, papers: list[dict]):
        jobtasks = [
            JobTaskCreate(
                job_id=job_id,
                doi=paper["doi"],
                title=paper["title"],
                abstract=paper["abstract"]
            )
            for paper in papers
        ]
        return await self.jobtask_crud.bulk_create_jobtasks(jobtasks)
    
    async def start_job_tasks(self, job_id: int):
        return process_job_task.delay(job_id)
        