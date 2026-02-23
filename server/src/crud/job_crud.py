from typing import List
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.job import Job
from src.db.models.project import Project
from src.schemas.job import JobCreate, JobRead


class JobCrud:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def fetch_jobs(self) -> List[JobRead]:
        stmt = select(
            Job.uuid,
            Project.uuid.label("project_uuid"),
            Job.llm_config,
            Job.prompting_config,
            Job.created_at,
            Job.updated_at,
        ).join(Project, Project.id == Job.project_id)
        result = await self.db.execute(stmt)
        # TODO: Fix

        return result.mappings().all()  # type: ignore

    async def fetch_jobs_by_project(self, project_uuid: UUID):
        stmt = (
            select(
                Job.uuid,
                Project.uuid.label("project_uuid"),
                Job.llm_config,
                Job.prompting_config,
                Job.created_at,
                Job.updated_at,
            )
            .join(Project, Project.id == Job.project_id)
            .where(Project.uuid == project_uuid)
        )
        result = await self.db.execute(stmt)
        return result.mappings().all()

    async def fetch_job_by_uuid(self, uuid: UUID) -> JobRead:
        stmt = (
            select(
                Job.uuid,
                Project.uuid.label("project_uuid"),
                Job.llm_config,
                Job.prompting_config,
                Job.created_at,
                Job.updated_at,
            )
            .join(Project, Project.id == Job.project_id)
            .where(Job.uuid == uuid)
        )
        result = await self.db.execute(stmt)
        job = result.mappings().one_or_none()
        if not job:
            raise ValueError(f"Job with uuid {uuid} not found")
        # TODO: Fix
        return job  # type: ignore

    async def update_celery_task_id(self, job_uuid: UUID, celery_task_id: UUID):
        stmt = (
            update(Job)
            .where(Job.uuid == job_uuid)
            .values(celery_task_id=celery_task_id)
        )
        await self.db.execute(stmt)
        await self.db.flush()

    async def create_job(self, job_data: JobCreate):
        stmt = select(Project).where(Project.uuid == job_data.project_uuid)
        result = await self.db.execute(stmt)
        project = result.scalar_one_or_none()
        if not project:
            raise ValueError(f"Project with uuid {job_data.project_uuid} not found")

        new_job = Job(
            project_id=project.id,
            llm_config=job_data.llm_config.model_dump(),
            prompting_config=job_data.prompting_config.model_dump(),
        )
        self.db.add(new_job)
        await self.db.flush()
        await self.db.refresh(new_job)
        return new_job
