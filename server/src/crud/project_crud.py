from sqlalchemy import UUID, select
from sqlalchemy.ext.asyncio import AsyncSession
from models.project import Project

async def create_project(project_data: dict, db: AsyncSession):
    new_project = Project(**project_data)
    db.add(new_project)
    await db.commit()
    await db.refresh(new_project)
    return new_project

async def fetch_project_id(project_uuid: UUID, db: AsyncSession) -> int:
    result = await db.execute(
        select(Project).where(Project.uuid == project_uuid)
    )
    project = result.scalar_one_or_none()
    if project is None:
        raise ValueError(f"Project with UUID {project_uuid} not found")
    return project.id