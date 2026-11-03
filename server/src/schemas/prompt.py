from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from src.core.prompt_template import PROMPT_TYPES, validate_template
from src.schemas.job import JobPromptingType
from src.schemas.project import ScreeningTarget

MAX_SYSTEM_PROMPT_LENGTH = 10_000
MAX_USER_PROMPT_LENGTH = 50_000


class PromptText(BaseModel):
    system_prompt: str = Field(max_length=MAX_SYSTEM_PROMPT_LENGTH)
    user_prompt: str = Field(min_length=1, max_length=MAX_USER_PROMPT_LENGTH)
    change_note: Optional[str] = Field(default=None, max_length=500)


class PromptCreateRequest(PromptText):
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=2000)
    prompting_type: JobPromptingType
    screening_target: ScreeningTarget = ScreeningTarget.PAPER

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name must be a non-empty string")
        return v.strip()

    @model_validator(mode="after")
    def check_template(self):
        if self.prompting_type not in PROMPT_TYPES:
            raise ValueError(
                f"Prompts can't be written for {self.prompting_type.value} prompting"
            )
        errors = validate_template(
            self.prompting_type, self.system_prompt, self.user_prompt
        )
        if errors:
            raise ValueError("; ".join(errors))
        return self


class PromptVersionCreateRequest(PromptText):
    """The template is checked against the prompt's type in the service."""


class PromptUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("name must be a non-empty string")
        return v.strip() if v is not None else v


class PromptVersionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    uuid: UUID
    version: int
    system_prompt: str
    user_prompt: str
    change_note: Optional[str] = None
    created_at: datetime


class PromptSourceRead(BaseModel):
    """The publication a built-in prompt comes from."""

    label: str
    citation: str
    doi: str
    # The version whose text is the published prompt.
    version: int


class PromptRead(BaseModel):
    uuid: UUID
    name: str
    description: Optional[str] = None
    prompting_type: JobPromptingType
    screening_target: ScreeningTarget
    # Built-in prompts are shared by every account and can't be changed.
    is_default: bool
    source: Optional[PromptSourceRead] = None
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
    example: str


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
