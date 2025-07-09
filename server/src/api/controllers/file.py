from uuid import UUID
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Form, status
from typing import List
from src.services.file_service import FileService, get_file_service
from src.schemas.file import FileRead

router = APIRouter(prefix="/api")

@router.get("/files", status_code=status.HTTP_200_OK, response_model=list[FileRead])
async def list_files(project_uuid: UUID, files: FileService = Depends(get_file_service)):
    try:
        return await files.fetch_all(project_uuid)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to fetch files: {str(e)}")

@router.post("/files/upload", status_code=200, response_model=dict)
async def process_csv(
    project_uuid: UUID = Form(...),
    files: List[UploadFile] = File(...), 
    file_service: FileService = Depends(get_file_service),
):
    return await file_service.process_files(project_uuid, files)
