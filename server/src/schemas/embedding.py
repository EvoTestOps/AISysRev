from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, field_validator


class EmbeddingConfigCreate(BaseModel):
    """Schema for creating an embedding configuration."""

    project_uuid: UUID
    name: str = Field(max_length=255)
    model_name: str = Field(
        max_length=255,
        description="Name of the embedding model (e.g., openai/text-embedding-3-small)",
    )
    prompt_prefix: str | None = Field(
        None,
        description="Optional prefix to add before title and abstract",
    )

    @field_validator("name", "model_name")
    @classmethod
    def non_empty(cls, v: str, field):
        if not v.strip():
            raise ValueError(f"{field.field_name} must be a non-empty string")
        return v.strip()

    @field_validator("prompt_prefix")
    @classmethod
    def clean_prefix(cls, v: str | None):
        if v is not None:
            return v.strip() if v.strip() else None
        return v


class EmbeddingConfigRead(BaseModel):
    """Schema for reading an embedding configuration."""

    id: int
    uuid: UUID
    project_uuid: UUID
    name: str
    model_name: str
    prompt_prefix: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EmbeddingConfigUpdate(BaseModel):
    """Schema for updating an embedding configuration."""

    name: str | None = Field(None, max_length=255)
    model_name: str | None = Field(None, max_length=255)
    prompt_prefix: str | None = None

    @field_validator("name", "model_name")
    @classmethod
    def non_empty_if_provided(cls, v: str | None, field):
        if v is not None and not v.strip():
            raise ValueError(f"{field.field_name} must be a non-empty string")
        return v.strip() if v else v
