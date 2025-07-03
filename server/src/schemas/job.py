from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator

class ModelConfig(BaseModel):
    model_name: str
    temperature: float = Field(ge=0, le=1)
    seed: int
    top_p: float = Field(ge=0, le=1)

class JobCreate(BaseModel):
    project_uuid: UUID
    model_conf: ModelConfig

class JobRead(BaseModel):
    uuid: UUID
    project_uuid: UUID
    model_conf: ModelConfig

    model_config = ConfigDict(from_attributes=True)
