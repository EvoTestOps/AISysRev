"""Bulk create/delete endpoints used by the Playwright e2e tests to seed and
clean up data. Only registered when APP_ENV=test (see src/main.py), so they do
not exist in any other environment.

The router must be included before the regular project/paper/file routers so
that e.g. DELETE /project/batch is not matched by DELETE /project/{uuid}.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError

from src.core.auth import get_current_user
from src.db.db_context import DBContext, get_db_ctx
from src.db.models.user import User
from src.event_queue import EventName, QueueItem, publish_event
from src.schemas.paper import PaperCreate, PaperRead
from src.schemas.project import ProjectCreate, ProjectCreateRequest
from src.services.file_service import create_file_service
from src.services.paper_service import create_paper_service
from src.services.project_service import create_project_service

router = APIRouter(tags=["E2E support"])


@router.post("/project/batch", status_code=status.HTTP_201_CREATED)
async def create_projects_batch(
    request_data: list[ProjectCreateRequest],
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    projects = create_project_service(db_ctx)
    try:
        project_data = [
            ProjectCreate(**item.model_dump(), owner_uuid=current_user.uuid)
            for item in request_data
        ]
        created = await projects.create_batch(project_data)
        await db_ctx.commit()
        for _, new_uuid in created:
            await publish_event(
                current_user.uuid,
                QueueItem(
                    event_name=EventName.PROJECT_CREATED, value={"uuid": new_uuid}
                ),
            )
        return [{"id": pid, "uuid": str(puuid)} for pid, puuid in created]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch project creation failed: {str(e)}",
        )


@router.delete("/project/batch", status_code=status.HTTP_200_OK)
async def delete_projects_batch(
    uuids: list[UUID],
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    projects = create_project_service(db_ctx)
    try:
        deleted_uuids, storage_paths = await projects.delete_batch(
            uuids, current_user.uuid
        )
        await db_ctx.commit()
        if deleted_uuids:
            await projects.cleanup_pdf_storage(storage_paths)
        return {"deleted": [str(u) for u in deleted_uuids]}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to batch delete projects: {str(e)}",
        )


@router.post(
    "/paper/batch",
    status_code=status.HTTP_201_CREATED,
    response_model=list[PaperRead],
)
async def create_papers_batch(
    request_data: list[PaperCreate],
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    papers = create_paper_service(db_ctx)
    try:
        created = await papers.create_batch(request_data, current_user.uuid)
        await db_ctx.commit()
        return created
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except IntegrityError as ie:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid paper data: {ie}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch paper creation failed: {str(e)}",
        )


@router.delete("/paper/batch", status_code=status.HTTP_200_OK)
async def delete_papers_batch(
    uuids: list[UUID],
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    papers = create_paper_service(db_ctx)
    try:
        deleted = await papers.delete_batch(uuids, current_user.uuid)
        await db_ctx.commit()
        return {"deleted": [str(u) for u in deleted]}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to batch delete papers: {str(e)}",
        )


@router.delete("/files/batch", status_code=status.HTTP_200_OK)
async def delete_files_batch(
    uuids: list[UUID],
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    file_service = create_file_service(db_ctx)
    try:
        deleted = await file_service.delete_batch(uuids, current_user.uuid)
        await db_ctx.commit()
        return {"deleted": [str(u) for u in deleted]}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to batch delete files: {str(e)}",
        )
