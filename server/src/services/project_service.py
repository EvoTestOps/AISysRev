from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from crud.project_crud import fetch_projects

async def fetch_all_projects(db: AsyncSession):
    try:
        return await fetch_projects(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch projects: {str(e)}")