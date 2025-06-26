from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.project import Project
from schemas.project import ProjectCreate, ProjectRead
from uuid import UUID

async def fetch_projects(db: AsyncSession) -> list[ProjectRead]:
    stmt = select(Project.uuid, Project.name, Project.inclusion_criteria, Project.exclusion_criteria)
    result = await db.execute(stmt)
    return result.mappings().all()

async def fetch_project_by_uuid(db: AsyncSession, uuid: str) -> ProjectRead:
    stmt = select(Project).where(Project.uuid == uuid)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()

async def create_project(db: AsyncSession, project_data: ProjectCreate) -> tuple[int, UUID]:
    new_project = Project(**project_data.model_dump(exclude_none=True))
    db.add(new_project)
    await db.commit()
    await db.refresh(new_project)
    return new_project.id, new_project.uuid

async def delete_project(db: AsyncSession, uuid: str) -> bool:
    stmt = select(Project).where(Project.uuid == uuid)
    result = await db.execute(stmt)
    project = result.scalar_one_or_none()
    
    if project:
        await db.delete(project)
        await db.commit()
        return True
    return False
