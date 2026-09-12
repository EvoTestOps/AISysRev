import json
from enum import Enum
from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import BaseModel, field_validator


class JobTaskHumanResult(str, Enum):
    INCLUDE = "INCLUDE"
    EXCLUDE = "EXCLUDE"
    UNSURE = "UNSURE"


class JobTaskHumanResultUpdate(BaseModel):
    human_result: JobTaskHumanResult


class JobTaskStatus(str, Enum):
    NOT_STARTED = "NOT_STARTED"
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    DONE = "DONE"
    ERROR = "ERROR"
    CANCELLED = "CANCELLED"


class JobTaskCreate(BaseModel):
    job_id: int
    doi: str | None
    title: str
    abstract: str
    paper_uuid: UUID
    pdf_file_uuid: UUID | None = None
    status: Optional[JobTaskStatus] = JobTaskStatus.NOT_STARTED


class JobTaskRead(BaseModel):
    uuid: UUID
    job_id: int
    doi: Optional[str]
    title: str
    abstract: str
    paper_uuid: UUID
    status: JobTaskStatus
    result: Optional[Dict[str, Any]]
    human_result: JobTaskHumanResult | None = None
    status_metadata: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

    @field_validator("result", mode="before")
    @classmethod
    def ensure_result_is_dict(cls, v: Any):
        if v is None or isinstance(v, dict):
            return v
        if isinstance(v, str):
            return json.loads(v)
        raise ValueError("JobTaskRead.result must be a dict or JSON string")


class JobTaskReadWithLLMConfig(BaseModel):
    uuid: UUID
    job_id: int
    doi: Optional[str]
    title: str
    abstract: str
    paper_uuid: UUID
    status: JobTaskStatus
    result: Optional[Dict[str, Any]] = None
    human_result: Optional[JobTaskHumanResult] = None
    status_metadata: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    llm_config: Optional[Dict[str, Any]] = None
    prompting_config: Optional[Dict[str, Any]] = None
    screening_mode: str

    @field_validator("result", mode="before")
    @classmethod
    def ensure_result_is_dict(cls, v: Any):
        if v is None or isinstance(v, dict):
            return v
        if isinstance(v, str):
            return json.loads(v)
        raise ValueError("JobTaskRead.result must be a dict or JSON string")
