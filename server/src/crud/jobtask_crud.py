from uuid import UUID
from typing import List, Tuple
from src.schemas.llm import StructuredResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from src.schemas.jobtask import JobTaskCreate, JobTaskHumanResult
from src.schemas.paper import PaperCreate
from src.models.paper import Paper
from src.models.job import Job
from src.models.jobtask import JobTask


class JobTaskCrud:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def bulk_create_papers(self, papers: List[PaperCreate]):
        db_objs = [Paper(**paper.model_dump()) for paper in papers]
        self.db.add_all(db_objs)
        await self.db.flush()
        return db_objs

    async def bulk_create_jobtasks(self, jobtasks: List[JobTaskCreate]):
        db_objs = [JobTask(**task.model_dump()) for task in jobtasks]
        self.db.add_all(db_objs)
        await self.db.flush()
        return db_objs

    async def fetch_job_tasks_by_job_id(self, job_id: int) -> List[JobTask]:
        stmt = select(JobTask).where(JobTask.job_id == job_id)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def fetch_job_tasks_by_job_uuid(self, job_uuid: UUID) -> List[JobTask]:
        stmt = (
            select(JobTask)
            .join(Job, JobTask.job_id == Job.id)
            .where(Job.uuid == job_uuid)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def fetch_job_tasks_by_paper_uuid(
        self, paper_uuid: UUID
    ) -> List[Tuple[JobTask, Job]]:
        stmt = (
            select(JobTask, Job)
            .join(Job, JobTask.job_id == Job.id)
            .where(JobTask.paper_uuid == paper_uuid)
        )
        return (await self.db.execute(stmt)).all()

    async def update_job_task_status(self, job_task_id: int, status: str):
        stmt = update(JobTask).where(JobTask.id == job_task_id).values(status=status)
        await self.db.execute(stmt)
        await self.db.commit()

    async def update_job_tasks_status(self, job_id: int, status: str):
        stmt = update(JobTask).where(JobTask.job_id == job_id).values(status=status)
        await self.db.execute(stmt)
        await self.db.commit()

    async def update_job_task_result(
        self, job_task_id: int, result: StructuredResponse
    ):
        stmt = (
            update(JobTask)
            .where(JobTask.id == job_task_id)
            .values(result=result.model_dump(mode="json"))
        )
        await self.db.execute(stmt)
        await self.db.commit()

    async def add_jobtask_human_result(
        self, job_task_uuid: UUID, human_result: JobTaskHumanResult
    ):
        stmt = (
            update(JobTask)
            .where(JobTask.uuid == job_task_uuid)
            .values(human_result=human_result)
        )
        await self.db.execute(stmt)
        await self.db.commit()
