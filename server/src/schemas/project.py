from typing import List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, field_validator

class Criteria(BaseModel):
    inclusion_criteria: List[str]
    exclusion_criteria: List[str]

    @field_validator("inclusion_criteria", "exclusion_criteria")
    @classmethod
    def non_empty_list(cls, v: List[str], field):
        if not isinstance(v, list) or not all(isinstance(i, str) and i.strip() for i in v):
            raise ValueError(f"{field.field_name} must be a list of non-empty strings")
        return v

class ProjectCreate(BaseModel):
    uuid: UUID | None = None
    name: str = Field(max_length=255)
    criteria: Criteria

    @field_validator("name")
    @classmethod
    def non_empty(cls, v: str, field):
        if not v.strip():
            raise ValueError(f"{field.field_name} must be a non-empty string")
        return v

class ProjectRead(BaseModel):
    uuid: UUID
    name: str = Field(max_length=255)
    criteria: Criteria
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
