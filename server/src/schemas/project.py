from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class FewShotPreferences(BaseModel):
    inc_seed_papers: List[str]
    exc_seed_papers: List[str]


class ProjectPreferences(BaseModel):
    few_shot: Optional[FewShotPreferences]


class Criteria(BaseModel):
    inclusion_criteria: List[str]
    exclusion_criteria: List[str]
    inclusion_expression: Optional[str] = None
    exclusion_expression: Optional[str] = None

    @field_validator("inclusion_criteria", "exclusion_criteria")
    @classmethod
    def non_empty_list(cls, v: List[str], field):
        if not isinstance(v, list) or not all(
            isinstance(i, str) and i.strip() for i in v
        ):
            raise ValueError(f"{field.field_name} must be a list of non-empty strings")
        return v

    @model_validator(mode="after")
    def validate_expressions(self) -> "Criteria":
        from src.tools.boolean_parser import parse_expression

        inc_ids = [f"IC{i + 1}" for i in range(len(self.inclusion_criteria))]
        exc_ids = [f"EC{i + 1}" for i in range(len(self.exclusion_criteria))]
        all_ids = inc_ids + exc_ids

        if self.inclusion_expression:
            try:
                parse_expression(self.inclusion_expression, all_ids)
            except ValueError as e:
                raise ValueError(f"inclusion_expression: {e}")

        if self.exclusion_expression:
            try:
                parse_expression(self.exclusion_expression, all_ids)
            except ValueError as e:
                raise ValueError(f"exclusion_expression: {e}")

        return self


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
    preferences: Optional[ProjectPreferences]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
