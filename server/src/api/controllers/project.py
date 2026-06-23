from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from src.core.auth import get_current_user
from src.db.db_context import DBContext, get_db_ctx
from src.db.models.user import User
from src.event_queue import EventName, QueueItem, publish_event
from src.schemas.project import ProjectCreate, ProjectCreateRequest, ProjectRead
from src.services.project_service import create_project_service

router = APIRouter()


@router.get(
    "/project",
    status_code=status.HTTP_200_OK,
    response_model=list[ProjectRead],
    tags=["Project"],
)
async def list_projects(
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    projects = create_project_service(db_ctx)
    try:
        return await projects.fetch_all(current_user.uuid)
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
async def get_project(
    uuid: UUID,
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    projects = create_project_service(db_ctx)
    try:
        project = await projects.fetch_by_uuid(uuid, owner_uuid=current_user.uuid)
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
    request_data: ProjectCreateRequest,
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    projects = create_project_service(db_ctx)
    try:
        project_data = ProjectCreate(
            **request_data.model_dump(),
            owner_uuid=current_user.uuid,
        )
        new_id, new_uuid = await projects.create(project_data)
        await db_ctx.commit()
        await publish_event(
            current_user.uuid,
            QueueItem(event_name=EventName.PROJECT_CREATED, value={"uuid": new_uuid}),
        )
        return {"id": new_id, "uuid": str(new_uuid)}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Project creation failed: {str(e)}",
        )


@router.delete(
    "/project/{uuid}", status_code=status.HTTP_200_OK, tags=["Project"]
)
async def delete_project(
    uuid: UUID,
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    projects = create_project_service(db_ctx)
    try:
        project = await projects.fetch_by_uuid(uuid, owner_uuid=current_user.uuid)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
            )
        await projects.delete(uuid)
        await db_ctx.commit()
        return {"detail": "Project deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete project: {str(e)}",
        )
