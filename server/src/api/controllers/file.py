from typing import List
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)

from src.core.auth import get_current_user
from src.db.db_context import DBContext, get_db_ctx
from src.db.models.user import User
from src.schemas.file import FileReadWithPaperCount
from src.services.file_service import create_file_service

router = APIRouter()


@router.get(
    "/files/{project_uuid}",
    status_code=status.HTTP_200_OK,
    response_model=list[FileReadWithPaperCount],
    tags=["File"],
)
async def list_files(
    project_uuid: UUID,
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    file_service = create_file_service(db_ctx)
    try:
        return await file_service.fetch_all(project_uuid, current_user.uuid)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch files: {str(e)}",
        )


@router.post("/files/upload", status_code=200, response_model=dict, tags=["File"])
async def process_csv(
    project_uuid: UUID = Form(...),
    files: List[UploadFile] = File(...),
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    file_service = create_file_service(db_ctx)
    try:
        existing_files = await file_service.fetch_all(project_uuid, current_user.uuid)
        if len(existing_files) != 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only one file allowed per project",
            )
        result = await file_service.process_files(project_uuid, files, current_user.uuid)
        await db_ctx.commit()
        return result.__dict__
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload files: {str(e)}",
        )
