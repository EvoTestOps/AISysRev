from uuid import UUID
from fastapi import APIRouter, UploadFile, File, Depends, Form
from typing import List
from src.services.file_service import FileService, get_file_service

router = APIRouter(prefix="/api")

@router.post("/files/upload", status_code=200, response_model=dict)
async def process_csv(
    project_uuid: UUID = Form(...),
    files: List[UploadFile] = File(...), 
    file_service: FileService = Depends(get_file_service),
):
    return await file_service.process_files(project_uuid, files)
