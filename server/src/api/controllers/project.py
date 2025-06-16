from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from db.session import get_db
from services.project_service import fetch_projects

router = APIRouter(prefix="/api")

@router.get("/project")
async def list_projects(db: AsyncSession = Depends(get_db)):
    return await fetch_projects(db)
