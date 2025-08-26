import pandas as pd
import io
from uuid import UUID
from fastapi import Depends, UploadFile
from typing import List
from pydantic import BaseModel
from src.services.paper_service import PaperCreate, PaperCrud
from sqlalchemy.ext.asyncio import AsyncSession
from minio.error import S3Error
from src.db.session import get_db
from src.tools.csv_file_validation import validate_csv
from src.tools.minio_file_uploader import upload_file_to_object_storage
from src.tools.minio_client import minio_client
from src.crud.file_crud import FileCrud
from src.schemas.file import FileCreate, FileReadWithPaperCount
from src.core.config import settings


class FileError(BaseModel):
    file: str
    message: str


class ProcessedFiles(BaseModel):
    valid_filenames: List[str]
    errors: List[FileError]


class UploadedFilePaper(BaseModel):
    title: str
    abstract: str
    doi: str
    file_uuid: str


class FileService:
    def __init__(self, db: AsyncSession, file_crud: FileCrud, paper_crud: PaperCrud):
        self.db = db
        self.file_crud = file_crud
        self.paper_crud = paper_crud

    async def fetch_all(self, project_uuid: UUID):
        rows = await self.file_crud.fetch_files(project_uuid)
        return [FileReadWithPaperCount(**row) for row in rows]
    
    async def generate_result_csv(self, project_uuid: UUID) -> str:
        pass

    async def process_files(
        self, project_uuid: UUID, files: List[UploadFile]
    ) -> ProcessedFiles:
        """
        Processes a list of uploaded files for a given project.
        Validates each file as a CSV, creates a database record, and uploads the file to object storage.
        Collects errors encountered during validation or upload.
        Args:
            project_uuid (UUID): The UUID of the project to associate the files with.
            files (List[UploadFile]): A list of files to process.
        Returns:
            ProcessedFiles: A dictionary containing lists of valid filenames and errors.
                    "valid_filenames": List[str],  # Filenames successfully processed and uploaded
                    "errors": List[dict],          # Errors encountered during processing
        Raises:
            Exception: Propagates any unexpected exceptions encountered during processing.
        """
        errors: List[FileError] = []
        valid_filenames: List[str] = []

        async with (
            self.db.begin_nested() if self.db.in_transaction() else self.db.begin()
        ):
            for f in files:
                validation_errors = validate_csv(f.file, f.filename)
                if validation_errors:
                    errors.extend(validation_errors)
                    continue

                try:
                    file_data = FileCreate(
                        project_uuid=project_uuid,
                        filename=f.filename,
                        mime_type=f.content_type,
                    )
                    result = await self.file_crud.create_file_record(file_data)

                    # Seek to beginning of file
                    try:
                        f.file.seek(0)
                    except Exception:
                        pass

                    raw_bytes = f.file.read()
                    papers = []

                    df = pd.read_csv(io.BytesIO(raw_bytes), encoding="utf-8-sig")
                    df.columns = [str(c).strip().lower() for c in df.columns]

                    for idx, row in df.iterrows():
                        normalized = {
                            (k or "").strip().lower(): (v or "").strip()
                            for k, v in row.items()
                        }

                        papers.append(
                            PaperCreate(
                                paper_id=idx + 1,
                                title=normalized.get("title"),
                                abstract=normalized.get("abstract"),
                                doi=normalized.get("doi"),
                                file_uuid=result.uuid,
                                project_uuid=project_uuid,
                            )
                        )

                    if papers:
                        await self.paper_crud.bulk_create_papers(papers)

                    upload_file_to_object_storage(f.file, f.filename, str(result.uuid))

                    valid_filenames.append(f.filename)

                except S3Error as e:
                    errors.append(
                        {
                            "file": f.filename,
                            "message": f"MinIO upload failed: {str(e)}",
                        }
                    )
                except Exception as e:
                    raise e

        await self.db.commit()

        return {
            "valid_filenames": valid_filenames,
            "errors": errors,
        }


def get_file_service(db: AsyncSession = Depends(get_db)) -> FileService:
    return FileService(db, FileCrud(db), PaperCrud(db))
