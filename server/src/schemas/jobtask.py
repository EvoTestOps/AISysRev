import json
from uuid import UUID
from pydantic import BaseModel, field_validator
from typing import Dict, Optional, Any
from enum import Enum


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


class JobTaskCreate(BaseModel):
    job_id: int
    doi: str
    title: str
    abstract: str
    paper_uuid: UUID
    status: JobTaskStatus = JobTaskStatus.NOT_STARTED


class JobTaskRead(BaseModel):
    uuid: UUID
    job_id: int
    doi: str
    title: str
    abstract: str
    paper_uuid: UUID
    status: JobTaskStatus
    result: Optional[Dict[str, Any]] = None
    human_result: Optional[JobTaskHumanResult] = None
    status_metadata: Optional[Dict[str, Any]] = None

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
    doi: str
    title: str
    abstract: str
    paper_uuid: UUID
    status: JobTaskStatus
    result: Optional[Dict[str, Any]] = None
    human_result: Optional[JobTaskHumanResult] = None
    status_metadata: Optional[Dict[str, Any]] = None
    llm_config: Optional[Dict[str, Any]] = None

    @field_validator("result", mode="before")
    @classmethod
    def ensure_result_is_dict(cls, v: Any):
        if v is None or isinstance(v, dict):
            return v
        if isinstance(v, str):
            return json.loads(v)
        raise ValueError("JobTaskRead.result must be a dict or JSON string")
