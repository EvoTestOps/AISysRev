from typing import Any, List, Sequence, Tuple
from uuid import UUID

from sqlalchemy import Row, case, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.job import Job
from src.db.models.jobtask import JobTask
from src.db.models.paper import Paper
from src.db.models.project import Project
from src.schemas.jobtask import JobTaskCreate, JobTaskHumanResult, JobTaskStatus
from src.schemas.paper import PaperCreate


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

    async def fetch_job_tasks_by_job_id(self, job_id: int) -> Sequence[JobTask]:
        stmt = select(JobTask).where(JobTask.job_id == job_id)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def fetch_job_tasks_by_job_uuid(self, job_uuid: UUID) -> Sequence[JobTask]:
        stmt = (
            select(JobTask)
            .join(Job, JobTask.job_id == Job.id)
            .where(Job.uuid == job_uuid)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def fetch_job_task_by_id(self, job_task_id: int) -> JobTask:
        stmt = select(JobTask).where(JobTask.id == job_task_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def fetch_job_tasks_by_paper_uuid(
        self, paper_uuid: UUID
    ) -> Sequence[Row[Tuple[JobTask, Job]]]:
        stmt = (
            select(JobTask, Job)
            .join(Job, JobTask.job_id == Job.id)
            .where(JobTask.paper_uuid == paper_uuid)
        )
        return (await self.db.execute(stmt)).all()

    async def fetch_tasks_stats_by_project(self, project_uuid):
        stmt = (
            select(
                Job.uuid.label("job_uuid"),
                func.count(JobTask.id).label("total_count"),
                func.coalesce(
                    func.sum(case((JobTask.status == JobTaskStatus.DONE, 1), else_=0))
                ).label("success_count"),
                func.coalesce(
                    func.sum(case((JobTask.status == JobTaskStatus.ERROR, 1), else_=0))
                ).label("failed_count"),
                func.coalesce(
                    func.sum(
                        case((JobTask.status == JobTaskStatus.CANCELLED, 1), else_=0)
                    )
                ).label("cancelled_count"),
            )
            .join(Job, JobTask.job_id == Job.id)
            .join(Project, Project.id == Job.project_id)
            .where(Project.uuid == project_uuid)
            .group_by(Job.uuid)
        )
        result = await self.db.execute(stmt)
        return result.mappings().all()

    async def fetch_task_stats_by_job(self, job_id: int):
        stmt = (
            select(
                func.count(JobTask.id).label("total_count"),
                func.coalesce(
                    func.sum(case((JobTask.status == JobTaskStatus.DONE, 1), else_=0))
                ).label("success_count"),
                func.coalesce(
                    func.sum(case((JobTask.status == JobTaskStatus.ERROR, 1), else_=0))
                ).label("failed_count"),
                func.coalesce(
                    func.sum(
                        case((JobTask.status == JobTaskStatus.CANCELLED, 1), else_=0)
                    )
                ).label("cancelled_count"),
            )
            .join(Job, JobTask.job_id == Job.id)
            .where(Job.id == job_id)
            .group_by(Job.uuid)
        )
        result = await self.db.execute(stmt)
        return result.mappings().first()

    async def update_job_task_status(self, job_task_id: int, status: str):
        stmt = update(JobTask).where(JobTask.id == job_task_id).values(status=status)
        await self.db.execute(stmt)
        await self.db.flush()

    async def update_job_tasks_status(self, job_id: int, status: str):
        stmt = update(JobTask).where(JobTask.job_id == job_id).values(status=status)
        await self.db.execute(stmt)
        await self.db.flush()

    """
    Sets status to CANCELLED for all unfinished job tasks.
    Should be called after canceling the job.
    """
    async def update_job_tasks_status_to_cancelled(self, job_id: int):
        stmt = (
            update(JobTask)
            .where(
                JobTask.job_id == job_id,
                JobTask.status.in_(
                    [
                        JobTaskStatus.NOT_STARTED,
                        JobTaskStatus.PENDING,
                        JobTaskStatus.RUNNING,
                    ]
                ),
            )
            .values(status=JobTaskStatus.CANCELLED)
        )
        await self.db.execute(stmt)

    async def update_job_task_result(self, job_task_id: int, result: Any):
        result_data = (
            result.model_dump(mode="json") if hasattr(result, "model_dump") else result
        )
        stmt = (
            update(JobTask).where(JobTask.id == job_task_id).values(result=result_data)
        )
        await self.db.execute(stmt)
        await self.db.flush()

    async def update_job_task_error(self, job_task_id: int, error: str):
        stmt = update(JobTask).where(JobTask.id == job_task_id).values(error=error)
        await self.db.execute(stmt)
        await self.db.flush()

    async def add_jobtask_human_result(
        self, job_task_uuid: UUID, human_result: JobTaskHumanResult
    ):
        stmt = (
            update(JobTask)
            .where(JobTask.uuid == job_task_uuid)
            .values(human_result=human_result)
        )
        await self.db.execute(stmt)
