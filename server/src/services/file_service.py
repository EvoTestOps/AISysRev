import asyncio
from pathlib import Path
from typing import List
from uuid import UUID, uuid4

from fastapi import UploadFile

from src.core.config import settings
from src.crud.file_crud import FileCrud
from src.db.db_context import DBContext
from src.event_queue import EventName, QueueItem, publish_event
from src.schemas.file import FileCreate, FileReadWithPaperCount
from src.schemas.file_service import FileError, ProcessedFiles, ProcessedPdfFiles
from src.schemas.paper import PaperRead
from src.services.paper_service import PaperCreate, PaperCrud
from src.tools.csv_file_validation import validate_csv
from src.tools.pdf_file_validation import validate_pdf
from src.tools.pdf_storage import build_storage_path, delete_pdf_bytes, read_pdf_bytes, write_pdf_bytes


class FileService:
    def __init__(
        self,
        file_crud: FileCrud,
        paper_crud: PaperCrud,
    ):
        self.file_crud = file_crud
        self.paper_crud = paper_crud

    async def fetch_all(self, project_uuid: UUID, owner_uuid: UUID) -> List[FileReadWithPaperCount]:
        rows = await self.file_crud.fetch_files(project_uuid, owner_uuid)
        return [FileReadWithPaperCount(**row) for row in rows]  # type: ignore

    async def process_files(
        self, project_uuid: UUID, files: List[UploadFile], owner_uuid: UUID
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

                papers = [
                    PaperCreate(
                        paper_id=int(idx) + 1,  # type: ignore
                        title=record.get("title"),  # type: ignore
                        abstract=record.get("abstract") or "NO_ABSTRACT",
                        doi=record.get("doi"),
                        file_uuid=result.uuid,
                        project_uuid=project_uuid,
                    )
                    for idx, record in enumerate(df.to_dict("records"))
                ]

                if papers:
                    await self.paper_crud.bulk_create_papers(papers)

                await publish_event(
                    owner_uuid,
                    QueueItem(
                        event_name=EventName.PROJECT_FILE_UPLOADED,
                        value={"uuid": result.uuid},
                    ),
                )

                valid_filenames.append(f.filename)
            except Exception as e:
                raise e

        return ProcessedFiles(
            valid_filenames=valid_filenames,
            errors=errors,
            empty_abstract_count=empty_abstract_count_total,
        )
    
    async def process_pdf_files(
        self, project_uuid: UUID, files: List[UploadFile], owner_uuid: UUID
    ) -> ProcessedPdfFiles:
        errors: List[FileError] = []
        valid_filenames: List[str] = []
        created_paper_count = 0

        next_paper_id = await self.paper_crud.fetch_max_paper_id(project_uuid, owner_uuid) + 1
        max_size_bytes = settings.MAX_PDF_UPLOAD_MB * 1024 * 1024

        for f in files:
            if f.filename is None:
                continue

            content = await f.read()
            validation_errors = validate_pdf(content, f.filename, max_size_bytes)
            if validation_errors:
                errors.extend(validation_errors)
                continue

            try:
                file_uuid = uuid4()
                storage_path = build_storage_path(project_uuid, file_uuid)
                await asyncio.to_thread(write_pdf_bytes, storage_path, content)

                file_data = FileCreate(
                    uuid=file_uuid,
                    project_uuid=project_uuid,
                    filename=f.filename,
                    mime_type="application/pdf",
                    storage_path=storage_path,
                )
                result = await self.file_crud.create_file_record(file_data)

                paper = PaperCreate(
                    paper_id=next_paper_id,
                    project_uuid=project_uuid,
                    pdf_file_uuid=result.uuid,
                    title=Path(f.filename).stem,
                    abstract="NO_ABSTRACT",
                    doi=None,
                )
                await self.paper_crud.bulk_create_papers([paper])

                await publish_event(
                    owner_uuid,
                    QueueItem(
                        event_name=EventName.PROJECT_FILE_UPLOADED,
                        value={"uuid": result.uuid},
                    ),
                )

                valid_filenames.append(f.filename)
                created_paper_count += 1
                next_paper_id += 1
            except Exception as e:
                raise e
            
        return ProcessedPdfFiles(
            valid_filenames=valid_filenames,
            errors=errors,
            created_paper_count=created_paper_count,
        )
    
    async def attach_pdf_to_paper(
        self, paper_uuid: UUID, file: UploadFile, owner_uuid: UUID
    ) -> tuple[PaperRead, str | None]:
        paper = await self.paper_crud.fetch_paper_by_uuid(paper_uuid, owner_uuid)
        if paper is None:
            raise ValueError("Paper not found")
        if file.filename is None:
            raise ValueError("Missing filename")
        
        old_pdf_file_uuid = paper.pdf_file_uuid
        
        content = await file.read()
        max_size_bytes = settings.MAX_PDF_UPLOAD_MB * 1024 * 1024
        validation_errors = validate_pdf(content, file.filename, max_size_bytes)
        if validation_errors:
            raise ValueError(validation_errors[0].message)
        
        file_uuid = uuid4()
        storage_path = build_storage_path(paper.project_uuid, file_uuid)
        await asyncio.to_thread(write_pdf_bytes, storage_path, content)

        file_data = FileCreate(
            uuid=file_uuid,
            project_uuid=paper.project_uuid,
            filename=file.filename,
            mime_type="application/pdf",
            storage_path=storage_path,
        )
        created_file = await self.file_crud.create_file_record(file_data)
        updated_paper = await self.paper_crud.set_paper_pdf_file_uuid(
            paper_uuid, owner_uuid, created_file.uuid
        )
        
        old_storage_path = None
        if old_pdf_file_uuid:
            old_file = await self.file_crud.fetch_file_by_uuid(old_pdf_file_uuid, owner_uuid)
            if old_file:
                old_storage_path = old_file.storage_path
                await self.file_crud.delete_file(old_file)

        await publish_event(
            owner_uuid,
            QueueItem(
                event_name=EventName.PROJECT_FILE_UPLOADED,
                value={"uuid": created_file.uuid},
            ),
        )
        return PaperRead.model_validate(updated_paper), old_storage_path
    
    async def cleanup_pdf_storage(self, storage_path: str) -> None:
        await asyncio.to_thread(delete_pdf_bytes, storage_path)
    
    async def fetch_file_content(self, file_uuid: UUID, owner_uuid: UUID) -> tuple[str, str, bytes]:
        file_record = await self.file_crud.fetch_file_by_uuid(file_uuid, owner_uuid)
        if file_record is None or file_record.storage_path is None:
            raise ValueError("File not found")
        content = await asyncio.to_thread(read_pdf_bytes, file_record.storage_path)
        return file_record.filename, file_record.mime_type, content


def create_file_service(db_ctx: DBContext) -> FileService:
    file_crud = db_ctx.crud(FileCrud)
    paper_crud = db_ctx.crud(PaperCrud)
    return FileService(file_crud, paper_crud)
