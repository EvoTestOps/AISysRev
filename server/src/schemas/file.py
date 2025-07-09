from uuid import UUID
from pydantic import BaseModel, Field, field_validator

class FileCreate(BaseModel):
    uuid: UUID | None = None
    project_uuid: UUID
    filename: str = Field(max_length=255)
    mime_type: str = Field(max_length=255)

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
