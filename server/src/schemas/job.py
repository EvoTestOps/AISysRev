from enum import Enum
from typing import Annotated, List, Literal, Union
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from src.core.llm.providers.local_openai_sdk import LocalOpenAISDKModelParams
from src.core.llm.providers.openai import OpenAIModelParams
from src.core.llm.providers.openrouter import OpenRouterModelParams


class JobPromptingType(str, Enum):
    ZERO_SHOT = "ZERO_SHOT"
    ONE_SHOT = "ONE_SHOT"
    FEW_SHOT = "FEW_SHOT"


class LLMModelConfig(BaseModel):
    provider_name: str
    model_name: str
    configuration: Union[
        OpenRouterModelParams, OpenAIModelParams, LocalOpenAISDKModelParams
    ]


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
