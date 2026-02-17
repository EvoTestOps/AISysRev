from typing import Any, Dict
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, field_validator


class VisualizationCreate(BaseModel):
    """Schema for creating a visualization."""

    project_uuid: UUID
    name: str = Field(max_length=255)
    visualization_type: str = Field(
        default="umap_embedding",
        max_length=50,
        description="Type of visualization (e.g., umap_embedding)",
    )
    config: Dict[str, Any] = Field(
        ..., description="Configuration for the visualization"
    )
    html_content: str = Field(..., description="HTML content of the visualization")
    source_job_uuid: UUID | None = Field(
        None, description="UUID of the job that generated this visualization"
    )

    @field_validator("name")
    @classmethod
    def non_empty(cls, v: str, field):
        if not v.strip():
            raise ValueError(f"{field.field_name} must be a non-empty string")
        return v.strip()

    @field_validator("html_content")
    @classmethod
    def non_empty_html(cls, v: str, field):
        if not v.strip():
            raise ValueError("HTML content cannot be empty")
        return v


class VisualizationRead(BaseModel):
    """Schema for reading a visualization."""

    id: int
    uuid: UUID
    project_uuid: UUID
    name: str
    visualization_type: str
    config: Dict[str, Any]
    source_job_uuid: UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VisualizationReadWithHTML(VisualizationRead):
    """Schema for reading a visualization with HTML content."""

    html_content: str


class VisualizationUpdate(BaseModel):
    """Schema for updating a visualization."""

    name: str | None = Field(None, max_length=255)
    config: Dict[str, Any] | None = None

    @field_validator("name")
    @classmethod
    def non_empty_if_provided(cls, v: str | None, field):
        if v is not None and not v.strip():
            raise ValueError(f"{field.field_name} must be a non-empty string")
        return v.strip() if v else v
