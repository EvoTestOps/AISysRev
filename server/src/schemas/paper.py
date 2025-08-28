from enum import Enum
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class PaperHumanResult(str, Enum):
    INCLUDE = "INCLUDE"
    EXCLUDE = "EXCLUDE"
    UNSURE = "UNSURE"

class PaperHumanResultUpdate(BaseModel):
    human_result: PaperHumanResult

class PaperCreate(BaseModel):
    paper_id: int
    project_uuid: UUID
    file_uuid: UUID
    doi: str
    title: str
    abstract: str

class PaperRead(BaseModel):
    uuid: UUID
    paper_id: int
    project_uuid: UUID
    file_uuid: UUID
    doi: str
    title: str
    abstract: str
    human_result: Optional[PaperHumanResult] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
