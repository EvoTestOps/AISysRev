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

    async def fetch_jobs(self, owner_uuid: UUID) -> List[JobRead]:
        stmt = (
            select(
                Job.uuid,
                Project.uuid.label("project_uuid"),
                Job.llm_config,
                Job.prompting_config,
                Job.screening_mode,
                Job.created_at,
                Job.updated_at,
            )
            .join(Project, Project.id == Job.project_id)
            .where(Project.owner_uuid == owner_uuid)
        )
        result = await self.db.execute(stmt)
        # TODO: Fix

        return result.mappings().all()  # type: ignore

    async def fetch_jobs_by_project(self, project_uuid: UUID, owner_uuid: UUID) -> List[JobRead]:
        stmt = (
            select(
                Job.uuid,
                Job.id,
                Project.uuid.label("project_uuid"),
                Job.llm_config,
                Job.prompting_config,
                Job.screening_mode,
                Job.created_at,
                Job.updated_at,
            )
            .join(Project, Project.id == Job.project_id)
            .where(Project.uuid == project_uuid)
            .where(Project.owner_uuid == owner_uuid)
        )
        result = await self.db.execute(stmt)
        return result.mappings().all()

    async def fetch_job_by_uuid(self, uuid: UUID, owner_uuid: UUID) -> JobRead:
        stmt = (
            select(
                Job.uuid,
                Project.uuid.label("project_uuid"),
                Job.llm_config,
                Job.prompting_config,
                Job.screening_mode,
                Job.created_at,
                Job.updated_at,
            )
            .join(Project, Project.id == Job.project_id)
            .where(Job.uuid == uuid)
            .where(Project.owner_uuid == owner_uuid)
        )
        result = await self.db.execute(stmt)
        job = result.mappings().one_or_none()
        if not job:
            raise ValueError(f"Job with uuid {uuid} not found")
        # TODO: Fix
        return job  # type: ignore

    # Quick fix to not mess with fetch_job_by_uuid()
    async def fetch_job_by_uuid_with_ids(self, uuid: UUID, owner_uuid: UUID):
        stmt = (
            select(
                Job.id,
                Job.uuid,
                Project.uuid.label("project_uuid"),
                Job.llm_config,
                Job.prompting_config,
                Job.screening_mode,
                Job.created_at,
                Job.updated_at,
                Job.celery_task_id,
            )
            .join(Project, Project.id == Job.project_id)
            .where(Job.uuid == uuid)
            .where(Project.owner_uuid == owner_uuid)
        )
        result = await self.db.execute(stmt)
        job = result.mappings().one_or_none()

        if not job:
            raise ValueError(f"Job with uuid {uuid} not found")
        return job

    async def fetch_celery_task_id(self, job_uuid: UUID) -> UUID | None:
        stmt = select(Job.celery_task_id).where(Job.uuid == job_uuid)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def update_celery_task_id(self, job_uuid: UUID, celery_task_id: UUID):
        stmt = (
            update(Job)
            .where(Job.uuid == job_uuid)
            .values(celery_task_id=celery_task_id)
        )
        await self.db.execute(stmt)
        await self.db.flush()

    async def delete_job(self, job_uuid: UUID, owner_uuid: UUID):
        stmt = (
            select(Job)
            .join(Project, Project.id == Job.project_id)
            .where(Job.uuid == job_uuid)
            .where(Project.owner_uuid == owner_uuid)
        )
        result = await self.db.execute(stmt)
        job = result.scalar_one_or_none()
        if job:
            await self.db.delete(job)

    async def create_job(self, job_data: JobCreate):
        stmt = (
            select(Project)
            .where(Project.uuid == job_data.project_uuid)
            .where(Project.owner_uuid == job_data.owner_uuid)
        )
        result = await self.db.execute(stmt)
        project = result.scalar_one_or_none()
        if not project:
            raise ValueError(f"Project with uuid {job_data.project_uuid} not found")

        new_job = Job(
            project_id=project.id,
            llm_config=job_data.llm_config.model_dump(),
            prompting_config=job_data.prompting_config.model_dump(),
            screening_mode=job_data.screening_mode.value,
        )
        self.db.add(new_job)
        await self.db.flush()
        await self.db.refresh(new_job)
        return new_job
