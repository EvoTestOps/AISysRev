from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from db.session import get_db
from schemas.project import ProjectCreate, ProjectRead
from crud.project_crud import (
    fetch_projects,
    fetch_project_by_uuid,
    create_project
)

router = APIRouter(prefix="/api")

@router.get("/project", status_code=200, response_model=list[ProjectRead])
async def list_projects(db: AsyncSession = Depends(get_db)):
    try:
        raw_projects = await fetch_projects(db)
        return [ProjectRead(**p) for p in raw_projects]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch projects: {str(e)}")
    
@router.get("/project/{uuid}", status_code=200, response_model=ProjectRead)
async def get_project(uuid: str, db: AsyncSession = Depends(get_db)):
    try:
        project = await fetch_project_by_uuid(db, uuid)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        return ProjectRead.model_validate(project)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch project: {str(e)}")

@router.post("/project", status_code=status.HTTP_201_CREATED)
async def create_new_project(project_data: ProjectCreate, db: AsyncSession = Depends(get_db)):
    try:
        new_id = await create_project(db, project_data)
        return {"id": new_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Project creation failed: {str(e)}")
