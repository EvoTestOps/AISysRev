from sqlalchemy.ext.asyncio import AsyncSession
from models.project import Project
from schemas.project_create import ProjectCreate

async def create_project(db: AsyncSession, project_data: ProjectCreate) -> int:
    new_project = Project(**project_data.model_dump(exclude_none=True))
    db.add(new_project)
    await db.commit()
    await db.refresh(new_project)
    return new_project.id
