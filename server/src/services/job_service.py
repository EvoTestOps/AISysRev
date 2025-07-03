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

def get_job_service(db: AsyncSession = Depends(get_db)) -> JobService:
    return JobService(db)