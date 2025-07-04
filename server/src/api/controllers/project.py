from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from src.schemas.project import ProjectCreate, ProjectRead
from src.services.project_service import ProjectService, get_project_service

router = APIRouter(prefix="/api")

@router.get("/project", status_code=status.HTTP_200_OK, response_model=list[ProjectRead])
async def list_projects(projects: ProjectService = Depends(get_project_service)):
    try:
        return await projects.fetch_all()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to fetch projects: {str(e)}")
    
@router.get("/project/{uuid}", status_code=status.HTTP_200_OK, response_model=ProjectRead)
async def get_project(uuid: UUID, projects: ProjectService = Depends(get_project_service)):
    try:
        project = await projects.fetch_by_uuid(uuid)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        return project
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to fetch project: {str(e)}")

@router.post("/project", status_code=status.HTTP_201_CREATED)
async def create_new_project(project_data: ProjectCreate, projects: ProjectService = Depends(get_project_service)):
    try:
        new_id, new_uuid = await projects.create(project_data)
        return {"id": new_id, "uuid": str(new_uuid)}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Project creation failed: {str(e)}")

@router.delete("/project/{uuid}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(uuid: UUID, projects: ProjectService = Depends(get_project_service)):
    try:
        deleted = await projects.delete(uuid)
        if not deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        return {"detail": "Project deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to delete project: {str(e)}")