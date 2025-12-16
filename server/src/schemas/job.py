from enum import Enum
from typing import Annotated, List, Literal, Union
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class JobPromptingType(str, Enum):
    ZERO_SHOT = "ZERO_SHOT"
    ONE_SHOT = "ONE_SHOT"
    FEW_SHOT = "FEW_SHOT"


class LLMModelConfig(BaseModel):
    model_name: str
    temperature: float = Field(ge=0, le=1)
    seed: int
    top_p: float = Field(ge=0.1, le=1)


# Define different configs for prompting strategies


class ZeroShotPromptingConfig(BaseModel):
    screening_type: Literal[JobPromptingType.ZERO_SHOT]


class FewShotPromptingConfig(BaseModel):
    screening_type: Literal[JobPromptingType.FEW_SHOT]
    seed_paper_inc: List[str]
    seed_paper_exc: List[str]
    remember_selection: bool


PromptingConfig = Annotated[
    Union[ZeroShotPromptingConfig, FewShotPromptingConfig],
    Field(discriminator="screening_type"),
]


class JobCreate(BaseModel):
    project_uuid: UUID
    prompting_config: PromptingConfig
    llm_config: LLMModelConfig
    # Ignore all other fields
    model_config = ConfigDict(extra="ignore")


class JobRead(BaseModel):
    uuid: UUID
    project_uuid: UUID
    prompting_config: PromptingConfig
    llm_config: LLMModelConfig
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
