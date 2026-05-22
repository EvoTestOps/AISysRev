from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class UserCreate(BaseModel):
    sub: str
    email: Optional[str] = None


class UserRead(BaseModel):
    uuid: UUID
    sub: str
    email: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
