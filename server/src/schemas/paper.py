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
    file_uuid: Optional[UUID] = None
    pdf_file_uuid: Optional[UUID] = None
    doi: Optional[str]
    title: str
    abstract: str


class PaperRead(BaseModel):
    uuid: UUID
    paper_id: int
    project_uuid: UUID
    file_uuid: Optional[UUID] = None
    pdf_file_uuid: Optional[UUID] = None
    doi: Optional[str]
    title: str
    abstract: str
    human_result: Optional[PaperHumanResult] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PaperReadWithAvgProbability(BaseModel):
    uuid: UUID
    paper_id: int
    project_uuid: UUID
    file_uuid: Optional[UUID] = None
    pdf_file_uuid: Optional[UUID] = None
    doi: Optional[str]
    title: str
    abstract: str
    human_result: Optional[PaperHumanResult] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    avg_probability_decision: Optional[float]
    error_messages: Optional[list[str]] = None
    pdf_filename: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
