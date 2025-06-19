from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from schemas.project import ProjectCreate, ProjectRead
from services.project_service import ProjectService, get_projects_service

router = APIRouter(prefix="/api")

@router.get("/project", status_code=200, response_model=list[ProjectRead])
async def list_projects(projects: ProjectService = Depends(get_projects_service)):
    try:
        return await projects.fetch_all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch projects: {str(e)}")
    
@router.get("/project/{uuid}", status_code=200, response_model=ProjectRead)
async def get_project(uuid: str, projects: ProjectService = Depends(get_projects_service)):
    try:
        project = await projects.fetch_by_uuid(uuid)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        return ProjectRead.model_validate(project)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch project: {str(e)}")

@router.post("/project", status_code=status.HTTP_201_CREATED)
async def create_new_project(project_data: ProjectCreate, projects: ProjectService = Depends(get_projects_service)):
    try:
        new_id = await projects.create(project_data)
        return {"id": new_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Project creation failed: {str(e)}")

@router.delete("/project/{uuid}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(uuid: str, projects: ProjectService = Depends(get_projects_service)):
    try:
        deleted = await projects.delete(uuid)
        if not deleted:
            raise HTTPException(status_code=404, detail="Project not found")
        return {"detail": "Project deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete project: {str(e)}")