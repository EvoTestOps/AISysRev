import json
from uuid import UUID
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PaperCreate(BaseModel):
    paper_id: int
    project_uuid: UUID
    file_uuid: UUID
    doi: str
    title: str
    abstract: str

class PaperRead(BaseModel):
    uuid: UUID
    project_uuid: UUID
    file_uuid: UUID
    doi: str
    title: str
    abstract: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
