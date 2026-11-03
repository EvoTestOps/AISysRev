from datetime import datetime
from typing import Annotated, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from src.schemas.job import JobPromptingType
from src.schemas.project import ScreeningTarget


class PromptText(BaseModel):
    """The template is checked against the prompt's type in the service."""

    system_prompt: str = Field(max_length=10_000)
    user_prompt: str = Field(min_length=1, max_length=50_000)
    change_note: Optional[str] = Field(default=None, max_length=500)


class PromptCreateRequest(PromptText):
    name: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)
    ]
    description: Optional[str] = Field(default=None, max_length=2000)
    prompting_type: JobPromptingType
    screening_target: ScreeningTarget = ScreeningTarget.PAPER


class PromptVersionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    uuid: UUID
    version: int
    system_prompt: str
    user_prompt: str
    change_note: Optional[str] = None
    created_at: datetime


class PromptRead(BaseModel):
    uuid: UUID
    name: str
    description: Optional[str] = None
    prompting_type: JobPromptingType
    screening_target: ScreeningTarget
    # Built-in prompts are shared by every account and can't be changed.
    is_default: bool
    archived: bool
    created_at: datetime
    updated_at: datetime
    latest_version: PromptVersionRead


class PromptDetail(PromptRead):
    # Newest first.
    versions: list[PromptVersionRead]


class PromptVariableRead(BaseModel):
    name: str
    label: str
    description: str


class PromptTypeVariables(BaseModel):
    prompting_type: JobPromptingType
    allowed: list[str]
    required: list[str]
    # Needs {{criteria}}, or both {{inclusion_criteria}} and {{exclusion_criteria}}.
    requires_criteria: bool


class PromptVariablesResponse(BaseModel):
    variables: list[PromptVariableRead]
    types: list[PromptTypeVariables]


class ResolvedPrompt(BaseModel):
    """The prompt version a job runs with."""

    prompt_uuid: Optional[UUID] = None
    prompt_name: Optional[str] = None
    version_uuid: Optional[UUID] = None
    version: Optional[int] = None
    system_prompt: str
    user_prompt: str
