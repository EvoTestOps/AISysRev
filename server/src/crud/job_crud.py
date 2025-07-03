from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.job import Job
from schemas.job import JobCreate, JobRead
from uuid import UUID

async def fetch_jobs(db: AsyncSession) -> list[JobRead]:
    stmt = select(Job)
    result = await db.execute(stmt)
    return result.mappings().all()

