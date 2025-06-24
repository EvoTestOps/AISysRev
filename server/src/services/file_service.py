from fastapi import Depends, HTTPException, UploadFile
from typing import List
from src.db.session import get_db
from minio.error import S3Error
from sqlalchemy.ext.asyncio import AsyncSession
from src.services.csv_file_validation import validate_csv
from src.services.minio_file_uploader import minio_file_uploader
from src.crud.file_crud import create_file_record
from src.schemas.file_create import FileCreate

class FileService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def process_files(self, project_id: str, files: List[UploadFile]) -> dict:
        errors = []
        valid_filenames = []

        for f in files:
            validation_errors = validate_csv(f.file, f.filename)
            if validation_errors:
                errors.extend(validation_errors)
                continue

            try:
                file_data = FileCreate(
                    project_id=int(project_id),
                    filename=f.filename,
                    mime_type=f.content_type
                )

                await create_file_record(self.db, file_data)
                
                minio_file_uploader(f.file, f.filename)
                valid_filenames.append(f.filename)

            except S3Error as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"MinIO upload failed: {str(e)}"
                )

        if errors:
            raise HTTPException(
                status_code=400, 
                detail={"errors": errors}
            )
        
        return {
            "status": "received",
            "valid_filenames": valid_filenames
        }

def get_file_service(db: AsyncSession = Depends(get_db)) -> FileService:
    return FileService(db)