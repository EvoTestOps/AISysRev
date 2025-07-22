from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.models.job import Job
from src.models.project import Project
from src.schemas.job import JobCreate, JobRead
from uuid import UUID

class JobCrud:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def fetch_jobs(self) -> List[JobRead]:
        stmt = (
            select(
                Job.uuid,
                Project.uuid.label("project_uuid"),
                Job.llm_config,
                Job.created_at,
                Job.updated_at
            )
            .join(Project, Project.id == Job.project_id)
        )
        result = await self.db.execute(stmt)
        return result.mappings().all()

    async def fetch_jobs_by_project(self, project_uuid: UUID):
        stmt = (
            select(
                Job.uuid,
                Project.uuid.label("project_uuid"),
                Job.llm_config,
                Job.created_at,
                Job.updated_at
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
                Job.created_at,
                Job.updated_at
            )
            .join(Project, Project.id == Job.project_id)
            .where(Job.uuid == uuid)
        )
        result = await self.db.execute(stmt)
        job = result.mappings().one_or_none()
        if not job:
            raise ValueError(f"Job with uuid {uuid} not found")
        return job

    async def create_jobs(self, job_data: JobCreate):
        stmt = select(Project).where(Project.uuid == job_data.project_uuid)
        result = await self.db.execute(stmt)
        project = result.scalar_one_or_none()
        if not project:
            raise ValueError(f"Project with uuid {job_data.project_uuid} not found")

        new_job = Job(
            project_id=project.id,
            llm_config=job_data.llm_config.model_dump()
        )
        self.db.add(new_job)
        await self.db.commit()
        await self.db.refresh(new_job)
        return new_job
