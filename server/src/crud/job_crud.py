from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.job import Job
from models.project import Project
from schemas.job import JobCreate, JobRead
from uuid import UUID

async def fetch_jobs(db: AsyncSession) -> list[JobRead]:
    stmt = select(Job)
    result = await db.execute(stmt)
    return result.mappings().all()

async def create_jobs(db: AsyncSession, job_data: JobCreate):
    stmt = select(Project).where(Project.uuid == job_data.project_uuid)
    result = await db.execute(stmt)
    project = result.scalar_one_or_none()
    if not project:
        raise ValueError(f"Project with uuid {job_data.project_uuid} not found")


    new_job = Job(
        project_id=project.id,
        model_config=job_data.model_conf.model_dump()
    )
    db.add(new_job)
    await db.commit()
    await db.refresh(new_job)
    return new_job

