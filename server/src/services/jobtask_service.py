from uuid import UUID
from src.schemas.jobtask import JobTaskCreate
from sqlalchemy.ext.asyncio import AsyncSession
from src.crud.jobtask_crud import JobTaskCrud

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
