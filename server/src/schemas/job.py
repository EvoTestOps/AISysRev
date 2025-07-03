from uuid import UUID
from pydantic import BaseModel, ConfigDict, field_validator

class JobCreate(BaseModel):
    project_uuid: UUID
    model_config: dict
    
    @field_validator("model_config")
    @classmethod
    def check_model_config_not_empty(cls, v):
        if not v:
            raise ValueError("model_config must not be empty")
        return v

class JobRead(BaseModel):
    uuid: UUID
    project_uuid: UUID
    model_config: dict

    model_config = ConfigDict(from_attributes=True)