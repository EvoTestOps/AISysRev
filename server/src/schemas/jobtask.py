from uuid import UUID
from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum

class JobTaskStatus(str, Enum):
    NOT_STARTED = "NOT_STARTED"
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    DONE = "DONE"
    ERROR = "ERROR"

class JobTaskCreate(BaseModel):
    job_id: int
    doi: str
    title: str
    abstract: str
    status: JobTaskStatus = JobTaskStatus.NOT_STARTED

class JobTaskRead(BaseModel):
    uuid: UUID
    job_uuid: UUID
    doi: str
    title: str
    abstract: str
    status: JobTaskStatus
    result: Optional[dict]
    human_result: Optional[str]
    status_metadata: Optional[dict]