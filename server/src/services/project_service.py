from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from crud.project_crud import fetch_projects, fetch_project_by_uuid

async def fetch_all_projects(db: AsyncSession):
    try:
        return await fetch_projects(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch projects: {str(e)}")
    
async def fetch_project(db: AsyncSession, uuid: str):
    try:
        project = await fetch_project_by_uuid(db, uuid)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        return project
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch project: {str(e)}")
