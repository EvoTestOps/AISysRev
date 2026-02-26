import io
from typing import List
from uuid import UUID

import pandas as pd
from fastapi import UploadFile
from minio.error import S3Error

from src.crud.file_crud import FileCrud
from src.db.db_context import DBContext
from src.event_queue import EventName, QueueItem, push_event
from src.schemas.file import FileCreate, FileReadWithPaperCount
from src.schemas.file_service import FileError, ProcessedFiles
from src.services.paper_service import PaperCreate, PaperCrud
from src.tools.csv_file_validation import validate_csv
from src.tools.minio_file_uploader import upload_file_to_object_storage


class FileService:
    def __init__(
        self,
        file_crud: FileCrud,
        paper_crud: PaperCrud,
    ):
        self.file_crud = file_crud
        self.paper_crud = paper_crud

    async def fetch_all(self, project_uuid: UUID):
        rows = await self.file_crud.fetch_files(project_uuid)
        return [FileReadWithPaperCount(**row) for row in rows]  # type: ignore

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
        empty_abstract_count_total = 0

        for f in files:
            if f.filename is None:
                continue
            if f.file is None:
                continue
            if f.content_type is None:
                continue

            df, validation_errors, file_empty_abstracts = validate_csv(
                f.file, f.filename
            )
            if validation_errors or df is None:
                errors.extend(validation_errors)
                continue

            empty_abstract_count_total += file_empty_abstracts

            try:
                file_data = FileCreate(
                    project_uuid=project_uuid,
                    filename=f.filename,
                    mime_type=f.content_type,
                )
                result = await self.file_crud.create_file_record(file_data)

                papers = []
                for idx, row in df.iterrows():
                    papers.append(
                        PaperCreate(
                            paper_id=int(idx) + 1,  # type: ignore
                            title=row.get("title"),  # type: ignore
                            abstract=row.get("abstract") or "NO_ABSTRACT",
                            doi=row.get("doi"),
                            file_uuid=result.uuid,
                            project_uuid=project_uuid,
                        )
                    )

                if papers:
                    await self.paper_crud.bulk_create_papers(papers)

                upload_file_to_object_storage(f.file, f.filename, str(result.uuid))
                await push_event(
                    QueueItem(
                        event_name=EventName.PROJECT_FILE_UPLOADED,
                        value={"uuid": result.uuid},
                    )
                )

                valid_filenames.append(f.filename)
            except S3Error as e:
                errors.append(
                    FileError(
                        file=f.filename,
                        message=f"MinIO upload failed: {str(e)}",
                        row="",
                    )
                )
            except Exception as e:
                raise e

        return ProcessedFiles(
            valid_filenames=valid_filenames,
            errors=errors,
            empty_abstract_count=empty_abstract_count_total,
        )


def create_file_service(db_ctx: DBContext) -> FileService:
    file_crud = db_ctx.crud(FileCrud)
    paper_crud = db_ctx.crud(PaperCrud)
    return FileService(file_crud, paper_crud)
