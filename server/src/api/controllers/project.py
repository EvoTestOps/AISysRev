from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from src.db.db_context import DBContext, get_db_ctx
from src.event_queue import EventName, QueueItem, push_event
from src.schemas.project import ProjectCreate, ProjectRead
from src.services.project_service import create_project_service

router = APIRouter()


@router.get(
    "/project",
    status_code=status.HTTP_200_OK,
    response_model=list[ProjectRead],
    tags=["Project"],
)
async def list_projects(db_ctx: DBContext = Depends(get_db_ctx)):
    projects = create_project_service(db_ctx)
    try:
        return await projects.fetch_all()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch projects: {str(e)}",
        )


@router.get(
    "/project/{uuid}",
    status_code=status.HTTP_200_OK,
    response_model=ProjectRead,
    tags=["Project"],
)
async def get_project(uuid: UUID, db_ctx: DBContext = Depends(get_db_ctx)):
    projects = create_project_service(db_ctx)
    try:
        project = await projects.fetch_by_uuid(uuid)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
            )
        return project
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch project: {str(e)}",
        )


@router.post("/project", status_code=status.HTTP_201_CREATED, tags=["Project"])
async def create_new_project(
    project_data: ProjectCreate, db_ctx: DBContext = Depends(get_db_ctx)
):
    projects = create_project_service(db_ctx)
    try:
        new_id, new_uuid = await projects.create(project_data)
        await db_ctx.commit()
        await push_event(
            QueueItem(event_name=EventName.PROJECT_CREATED, value={"uuid": new_uuid})
        )
        return {"id": new_id, "uuid": str(new_uuid)}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Project creation failed: {str(e)}",
        )


@router.delete(
    "/project/{uuid}", status_code=status.HTTP_204_NO_CONTENT, tags=["Project"]
)
async def delete_project(uuid: UUID, db_ctx: DBContext = Depends(get_db_ctx)):
    projects = create_project_service(db_ctx)
    try:
        deleted = await projects.delete(uuid)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Project not found"
            )
        await db_ctx.commit()
        return {"detail": "Project deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete project: {str(e)}",
        )
