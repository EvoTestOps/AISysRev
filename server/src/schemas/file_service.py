from typing import List, Optional

from pydantic import BaseModel


class FileError(BaseModel):
    file: str
    row: str
    message: str


class ProcessedFiles(BaseModel):
    valid_filenames: List[str]
    errors: List[FileError]
    empty_abstract_count: int = 0


class ProcessedPdfFiles(BaseModel):
    valid_filenames: List[str]
    errors: List[FileError]
    created_paper_count: int = 0


class UploadedFilePaper(BaseModel):
    title: str
    abstract: str
    doi: str
    file_uuid: str


class EndNoteRecord(BaseModel):
    doi: Optional[str] = None
    pdf_relative_path: Optional[str] = None


class FulltextImportUnmatched(BaseModel):
    filename: str
    reason: str


class FulltextImportResult(BaseModel):
    matched_count: int
    unmatched: List[FulltextImportUnmatched]
