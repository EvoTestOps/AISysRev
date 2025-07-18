from uuid import UUID
from src.schemas.jobtask import JobTaskCreate
from src.crud import jobtask_crud
from sqlalchemy.ext.asyncio import AsyncSession

class JobTaskService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def bulk_create(self, job_uuid: UUID, papers: list[dict]):
        jobtasks = [
            JobTaskCreate(
                job_uuid=job_uuid,
                doi=paper["doi"],
                title=paper["title"],
                abstract=paper["abstract"]
            )
            for paper in papers
        ]
        return await jobtask_crud.bulk_create_jobtasks(self.db, jobtasks)