from uuid import UUID
from pydantic import BaseModel, Field, field_validator

class Setting(BaseModel):
    id: int
    uuid: str
    name: str
    value: str
    secret: str


class SettingCreate(BaseModel):
    uuid: UUID | None = None
    name: str = Field(max_length=1024)
    value: str = Field(max_length=16384)
    secret: bool

    @field_validator("name", "value")
    @classmethod
    def non_empty(cls, v: str, field):
        if not v.strip():
            raise ValueError(f"{field.field_name} must be a non-empty string")
        return v

class SettingRead(BaseModel):
    uuid: UUID | None = None
    name: str = Field(max_length=1024)
    value: str = Field(max_length=16384)
    secret: bool