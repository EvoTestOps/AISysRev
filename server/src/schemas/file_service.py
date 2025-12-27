from typing import List
from pydantic import BaseModel


class FileError(BaseModel):
    file: str
    row: str
    message: str


class ProcessedFiles(BaseModel):
    valid_filenames: List[str]
    errors: List[FileError]


class UploadedFilePaper(BaseModel):
    title: str
    abstract: str
    doi: str
    file_uuid: str
