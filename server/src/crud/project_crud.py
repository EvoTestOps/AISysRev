from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.project import Project
from schemas.project import ProjectCreate

async def create_project(db: AsyncSession, project_data: ProjectCreate) -> int:
    try:
        new_project = Project(**project_data.model_dump(exclude_none=True))
        db.add(new_project)
        await db.commit()
        await db.refresh(new_project)
        return new_project.id
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Project creation failed: {str(e)}")

async def fetch_projects(db: AsyncSession):
    stmt = select(Project.uuid, Project.name, Project.criteria)
    result = await db.execute(stmt)
    return result.scalars().all()

