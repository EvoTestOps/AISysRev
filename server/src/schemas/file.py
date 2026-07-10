from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict, field_validator


class FileCreate(BaseModel):
    uuid: Optional[UUID] = None
    project_uuid: UUID
    filename: str = Field(max_length=255)
    mime_type: str = Field(max_length=255)
    storage_path: Optional[str] = None

    @field_validator("filename", "mime_type")
    @classmethod
    def non_empty(cls, v: str, field):
        if not v.strip():
            raise ValueError(f"{field.field_name} must be a non-empty string")
        return v


class FileRead(BaseModel):
    uuid: UUID
    project_uuid: UUID

    filename: str = Field(max_length=255)
    mime_type: str = Field(max_length=255)
    storage_path: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class FileReadWithPaperCount(FileRead):
    paper_count: int
