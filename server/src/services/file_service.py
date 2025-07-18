import csv
from uuid import UUID
from fastapi import Depends, HTTPException, UploadFile
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from minio.error import S3Error
from src.db.session import get_db
from src.services.csv_file_validation import validate_csv
from src.services.minio_file_uploader import minio_file_uploader
from src.services.minio_client import minio_client
from src.crud import file_crud
from src.schemas.file import FileCreate, FileRead
from src.core.config import settings

class FileService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def fetch_all(self, project_uuid: UUID):
        rows = await file_crud.fetch_files(self.db, project_uuid)
        return [FileRead(**row) for row in rows]
    
    async def fetch_papers(self, project_uuid: UUID):
        files = await file_crud.fetch_files(self.db, project_uuid)
        papers = []
        for file in files:
            try:
                res = minio_client.get_object(settings.MINIO_BUCKET, file.filename)
                content = res.read().decode("utf-8-sig")
            finally:
                if res:
                    res.close()
                    res.release_conn()
        reader = csv.DictReader(content.splitlines())
        for row in reader:
            papers.append({
                "title": row["title"],
                "abstract": row["abstract"],
                "doi": row["doi"]
            })
        return papers

    async def process_files(self, project_uuid: UUID, files: List[UploadFile]) -> dict:
        errors = []
        valid_filenames = []

        for f in files:
            validation_errors = validate_csv(f.file, f.filename)
            if validation_errors:
                errors.extend(validation_errors)
                continue

            try:
                file_data = FileCreate(
                    project_uuid=project_uuid,
                    filename=f.filename,
                    mime_type=f.content_type
                )
                await file_crud.create_file_record(self.db, file_data)
                minio_file_uploader(f.file, f.filename)
                valid_filenames.append(f.filename)

            except S3Error as e:
                errors.append({"file": f.filename, "message": f"MinIO upload failed: {str(e)}"})
        
        return {
            "valid_filenames": valid_filenames,
            "errors": errors,
        }

def get_file_service(db: AsyncSession = Depends(get_db)) -> FileService:
    return FileService(db)