from datetime import datetime
from enum import Enum
from typing import Annotated, Any, List, Literal, Optional, Union
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from src.schemas.project import ScreeningTarget


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
    AUTOMATIC = "AUTOMATIC"


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


DEFAULT_MAX_PARALLEL_CALLS = 20
MAX_PARALLEL_CALLS_LIMIT = 50


class JobPromptRef(BaseModel):
    """Which prompt version a job runs with, as it was named when the job started."""

    prompt_uuid: Optional[UUID] = None
    name: Optional[str] = None
    version: Optional[int] = None


# Define different configs for prompting strategies


class PromptSelection(BaseModel):
    # The prompt version to screen with; None picks the built-in prompt. Set to
    # the resolved version when the job is created, so every job pins one.
    prompt_version_uuid: Optional[UUID] = None
    # Filled in by the server when the job is created.
    prompt_ref: Optional[JobPromptRef] = None


class ZeroShotPromptingConfig(PromptSelection):
    screening_type: Literal[JobPromptingType.ZERO_SHOT] = JobPromptingType.ZERO_SHOT
    screening_target: ScreeningTarget = ScreeningTarget.PAPER


class FewShotPromptingConfig(PromptSelection):
    screening_type: Literal[JobPromptingType.FEW_SHOT] = JobPromptingType.FEW_SHOT
    screening_target: ScreeningTarget = ScreeningTarget.PAPER
    seed_paper_inc: List[str]
    seed_paper_exc: List[str]
    remember_selection: bool


class PerCriteriaPromptingConfig(PromptSelection):
    screening_type: Literal[JobPromptingType.PER_CRITERIA] = (
        JobPromptingType.PER_CRITERIA
    )
    screening_target: ScreeningTarget = ScreeningTarget.PAPER


PromptingConfig = Annotated[
    Union[ZeroShotPromptingConfig, FewShotPromptingConfig, PerCriteriaPromptingConfig],
    Field(discriminator="screening_type"),
]


class JobCreateRequest(BaseModel):
    project_uuid: UUID
    prompting_config: PromptingConfig
    llm_config: LLMModelConfig
    screening_mode: JobScreeningMode = JobScreeningMode.TEXT
    max_parallel_calls: int = Field(
        default=DEFAULT_MAX_PARALLEL_CALLS, ge=1, le=MAX_PARALLEL_CALLS_LIMIT
    )
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
    max_parallel_calls: int = DEFAULT_MAX_PARALLEL_CALLS
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
    max_parallel_calls: int = DEFAULT_MAX_PARALLEL_CALLS
    created_at: datetime
    updated_at: datetime

    stats: JobStats

    model_config = ConfigDict(from_attributes=True)


class JobCancelResponse(BaseModel):
    detail: str
