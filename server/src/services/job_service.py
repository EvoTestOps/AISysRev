from uuid import UUID
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.session import get_db
from src.crud import job_crud
from src.schemas.job import JobCreate, JobRead
from src.services.jobtask_service import JobTaskService
from src.services.file_service import FileService

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
        file_service = FileService(self.db)
        jobtask_service = JobTaskService(self.db)
        new_job = await job_crud.create_jobs(self.db, job_data)
        papers = await file_service.fetch_papers(self.db, job_data.project_uuid)
        await jobtask_service.bulk_create(new_job.id, papers)

        return JobRead(
            uuid=new_job.uuid,
            project_uuid=job_data.project_uuid,
            llm_config=new_job.llm_config,
            created_at=new_job.created_at,
            updated_at=new_job.updated_at
        )

def get_job_service(db: AsyncSession = Depends(get_db)) -> JobService:
    return JobService(db)