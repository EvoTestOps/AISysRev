import json
from uuid import UUID
from pydantic import BaseModel, field_validator
from typing import Dict, Optional, Any
from enum import Enum

class HumanResult(str, Enum):
    INCLUDE = "INCLUDE"
    EXCLUDE = "EXCLUDE"
    UNSURE = "UNSURE"

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
    result: Optional[Dict[str, Any]] = None
    human_result: Optional[HumanResult] = None
    status_metadata: Optional[Dict[str, Any]] = None
    
    @field_validator("result", mode="before")
    @classmethod
    def ensure_result_is_dict(cls, v: Any):
        if v is None or isinstance(v, dict):
            return v
        if isinstance(v, str):
            return json.loads(v)
        raise ValueError("result must be a dict or JSON string")
