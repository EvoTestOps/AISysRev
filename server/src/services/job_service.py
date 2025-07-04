from uuid import UUID
from fastapi import Depends
from src.db.session import get_db
from src.crud import job_crud
from schemas.job import JobCreate, JobRead
from sqlalchemy.ext.asyncio import AsyncSession

class JobService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def fetch_all(self) -> list[JobRead]:
        rows = await job_crud.fetch_jobs(self.db)
        return [JobRead(**row) for row in rows]
    
    async def fetch_by_project(self, project_uuid: UUID) -> list[JobRead]:
        rows = await job_crud.fetch_jobs_by_project(self.db, project_uuid)
        return [JobRead(**row) for row in rows]
    
    async def fetch_by_uuid(self, uuid: UUID) -> JobRead:
        job = await job_crud.fetch_job_by_uuid(self.db, uuid)
        return JobRead(**job)
    
    async def create(self, job_data: JobCreate):
        new_job = await job_crud.create_jobs(self.db, job_data)
        return JobRead(
            uuid=new_job.uuid,
            project_uuid=job_data.project_uuid,
            llm_config=new_job.llm_config
        )

def get_job_service(db: AsyncSession = Depends(get_db)) -> JobService:
    return JobService(db)