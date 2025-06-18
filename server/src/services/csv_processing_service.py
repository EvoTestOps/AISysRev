import uuid
from fastapi import HTTPException, UploadFile
from typing import List
from minio.error import S3Error
from sqlalchemy.ext.asyncio import AsyncSession
from services.csv_file_validation import validate_csv
from services.minio_file_uploader import minio_file_uploader
from crud.project_crud import create_project
from crud.file_crud import create_file_record
from schemas.project import ProjectCreate
from schemas.file_create import FileCreate

async def process_csv_files(db: AsyncSession, files: List[UploadFile]):
    errors = []
    valid_filenames = []

    for f in files:
        validation_errors = validate_csv(f.file, f.filename)
        if validation_errors:
            errors.extend(validation_errors)
            continue

        try:
            project_data = ProjectCreate(
                name=f.filename,
                criteria="ADD CRITERIA"
            )

            project_id = await create_project(db, project_data)

            file_data = FileCreate(
                project_id=project_id,
                filename=f.filename,
                mime_type=f.content_type
            )

            await create_file_record(db, file_data)
            
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
