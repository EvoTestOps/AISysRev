from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator

class ModelConfig(BaseModel):
    model_name: str
    temperature: float = Field(ge=0, le=1)
    seed: int
    top_p: float = Field(ge=0, le=1)

class JobCreate(BaseModel):
    project_uuid: UUID
    llm_config: ModelConfig

class JobRead(BaseModel):
    uuid: UUID
    project_uuid: UUID
    llm_config: ModelConfig
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
