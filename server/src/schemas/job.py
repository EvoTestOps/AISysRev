from datetime import datetime
from enum import Enum
from typing import Annotated, Any, List, Literal, Union
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class JobPromptingType(str, Enum):
    ZERO_SHOT = "ZERO_SHOT"
    ONE_SHOT = "ONE_SHOT"
    FEW_SHOT = "FEW_SHOT"
    PER_CRITERIA = "PER_CRITERIA"


class JobStatus(str, Enum):
    NOT_STARTED = "NOT_STARTED"
    RUNNING = "RUNNING"
    PARTIAL_SUCCESS = "PARTIAL_SUCCESS"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class JobScreeningMode(str, Enum):
    TEXT = "TEXT"
    PDF = "PDF"


class JobStats(BaseModel):
    total: int
    success: int
    failed: int
    status: JobStatus


class LLMModelConfig(BaseModel):
    provider_name: str
    model_name: str
    provider_parameters: dict[str, Any]  # These will be type-checked run-time
    model_parameters: dict[str, Any]  # These will be type-checked run-time


# Define different configs for prompting strategies


class ZeroShotPromptingConfig(BaseModel):
    screening_type: Literal[JobPromptingType.ZERO_SHOT] = JobPromptingType.ZERO_SHOT


class FewShotPromptingConfig(BaseModel):
    screening_type: Literal[JobPromptingType.FEW_SHOT] = JobPromptingType.FEW_SHOT
    seed_paper_inc: List[str]
    seed_paper_exc: List[str]
    remember_selection: bool


class PerCriteriaPromptingConfig(BaseModel):
    screening_type: Literal[JobPromptingType.PER_CRITERIA] = JobPromptingType.PER_CRITERIA


PromptingConfig = Annotated[
    Union[ZeroShotPromptingConfig, FewShotPromptingConfig, PerCriteriaPromptingConfig],
    Field(discriminator="screening_type"),
]


class JobCreateRequest(BaseModel):
    project_uuid: UUID
    prompting_config: PromptingConfig
    llm_config: LLMModelConfig
    screening_mode: JobScreeningMode = JobScreeningMode.TEXT
    # Ignore all other fields
    model_config = ConfigDict(extra="ignore")


class JobCreate(JobCreateRequest):
    owner_uuid: UUID

class JobRead(BaseModel):
    uuid: UUID
    project_uuid: UUID
    prompting_config: PromptingConfig
    llm_config: LLMModelConfig
    screening_mode: JobScreeningMode
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class JobReadWithStats(BaseModel):
    uuid: UUID
    id: int
    project_uuid: UUID
    prompting_config: PromptingConfig
    llm_config: LLMModelConfig
    screening_mode: JobScreeningMode
    created_at: datetime
    updated_at: datetime

    stats: JobStats

    model_config = ConfigDict(from_attributes=True)
