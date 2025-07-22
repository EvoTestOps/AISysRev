from typing import List
from src.schemas.jobtask import JobTaskCreate
from src.models.jobtask import JobTask
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update


class JobTaskCrud:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def bulk_create_jobtasks(self, jobtasks: List[JobTaskCreate]):
        db_objs = [JobTask(**task.model_dump()) for task in jobtasks]
        self.db.add_all(db_objs)
        await self.db.commit()
        return db_objs
    
    async def fetch_job_tasks_by_job_id(self, job_id: int) -> List[JobTask]:
        stmt = select(JobTask).where(JobTask.job_id == job_id)
        result = await self.db.execute(stmt)
        return result.scalars().all()
    
    async def update_job_task_status(self, job_task_id: int, status: str):
        stmt = update(JobTask).where(JobTask.id == job_task_id).values(status=status)
        await self.db.execute(stmt)
        await self.db.commit()

    async def update_job_tasks_status(self, job_id: int, status: str):
        stmt = update(JobTask).where(JobTask.job_id == job_id).values(status=status)
        await self.db.execute(stmt)
        await self.db.commit()
