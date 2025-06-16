from uuid import UUID
from pydantic import BaseModel, Field, field_validator

class ProjectCreate(BaseModel):
    uuid: UUID | None = None
    name: str = Field(max_length=255)
    criteria: str

    @field_validator("name", "criteria")
    @classmethod
    def non_empty(cls, v: str, field):
        if not v.strip():
            raise ValueError(f"{field.field_name} must be a non-empty string")
        return v