from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict, field_validator

class ProjectCreate(BaseModel):
    uuid: UUID | None = None
    name: str = Field(max_length=255)
    inclusion_criteria: str
    exclusion_criteria: str

    @field_validator("name", "inclusion_criteria", "exclusion_criteria")
    @classmethod
    def non_empty(cls, v: str, field):
        if not v.strip():
            raise ValueError(f"{field.field_name} must be a non-empty string")
        return v

class ProjectRead(BaseModel):
    uuid: UUID
    name: str = Field(max_length=255)
    inclusion_criteria: str
    exclusion_criteria: str

    model_config = ConfigDict(from_attributes=True)
