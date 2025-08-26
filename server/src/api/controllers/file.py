from uuid import UUID
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Form, status
from typing import List
from src.services.file_service import FileService, get_file_service
from src.schemas.file import FileReadWithPaperCount

router = APIRouter()


@router.get(
    "/files/{project_uuid}",
    status_code=status.HTTP_200_OK,
    response_model=list[FileReadWithPaperCount],
)
async def list_files(
    project_uuid: UUID, files: FileService = Depends(get_file_service)
):
    try:
        return await files.fetch_all(project_uuid)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch files: {str(e)}",
        )

@router.get("/download_result_csv", status_code=200)
async def download_result_csv(
    project_uuid: UUID,
    file_service: FileService = Depends(get_file_service),
):
    try:
        csv_content = await file_service.generate_result_csv(project_uuid)
        return {
            "filename": f"{project_uuid}_results.csv",
            "content": csv_content,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate CSV: {str(e)}",
        )

@router.post("/files/upload", status_code=200, response_model=dict)
async def process_csv(
    project_uuid: UUID = Form(...),
    files: List[UploadFile] = File(...),
    file_service: FileService = Depends(get_file_service),
):
    try:
        existing_files = await file_service.fetch_all(project_uuid=project_uuid)
        if len(existing_files) != 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only one file allowed per project",
            )
        return await file_service.process_files(project_uuid, files)

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload files: {str(e)}",
        )
