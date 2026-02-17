from typing import List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, field_validator


class ClassificationDimension(BaseModel):
    """A single classification dimension with its classes."""

    name: str = Field(..., description="Name of the classification dimension")
    classes: List[str] = Field(
        ..., min_length=2, description="List of classes for this dimension"
    )

    @field_validator("name")
    @classmethod
    def non_empty_name(cls, v: str, field):
        if not v.strip():
            raise ValueError(f"{field.field_name} must be a non-empty string")
        return v.strip()

    @field_validator("classes")
    @classmethod
    def valid_classes(cls, v: List[str], field):
        if not all(isinstance(c, str) and c.strip() for c in v):
            raise ValueError("All classes must be non-empty strings")
        return [c.strip() for c in v]


class ClassificationConfigCreate(BaseModel):
    """Schema for creating a classification configuration."""

    project_uuid: UUID
    name: str = Field(max_length=255)
    systematic_review_context: str = Field(
        ..., description="Context for the systematic review"
    )
    classifications: List[ClassificationDimension] = Field(
        ..., min_length=1, description="List of classification dimensions"
    )

    @field_validator("name", "systematic_review_context")
    @classmethod
    def non_empty(cls, v: str, field):
        if not v.strip():
            raise ValueError(f"{field.field_name} must be a non-empty string")
        return v.strip()


class ClassificationConfigRead(BaseModel):
    """Schema for reading a classification configuration."""

    id: int
    uuid: UUID
    project_uuid: UUID
    name: str
    systematic_review_context: str
    classifications: List[ClassificationDimension]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ClassificationConfigUpdate(BaseModel):
    """Schema for updating a classification configuration."""

    name: str | None = Field(None, max_length=255)
    systematic_review_context: str | None = None
    classifications: List[ClassificationDimension] | None = None

    @field_validator("name", "systematic_review_context")
    @classmethod
    def non_empty_if_provided(cls, v: str | None, field):
        if v is not None and not v.strip():
            raise ValueError(f"{field.field_name} must be a non-empty string")
        return v.strip() if v else v
