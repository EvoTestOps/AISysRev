from enum import Enum
from typing import Literal, Optional, Union
from pydantic import BaseModel


class LLMProvider(str, Enum):
    openrouter = "openrouter"
    openai = "openai"
    local_llm_openai = "local_llm_openai"


class BaseLLMParams(BaseModel):
    temperature: float = 0.0
    top_p: float = 0.1
    seed: int = 128


class OpenRouterParams(BaseLLMParams):
    pass


class OpenAICloudParams(BaseLLMParams):
    pass


class LocalOpenAISDKParams(BaseLLMParams):
    pass


class ConfigParameter(BaseModel):
    """
    Config parameter is something that the provider needs (e.g. API key or certain config) that must be provided via the AiSysRev UI.
    """

    key: str
    title: str
    type: Literal["string", "number", "boolean"] = "string"
    defaultValue: Optional[Union[str, int, float, bool]] = None
    secret: bool = True


class Provider(BaseModel):
    name: str
    title: str
    description: str
    parameter_schema: dict
    config_parameters: list[ConfigParameter]


def provider(
    name: LLMProvider,
    title: str,
    description: str,
    llm_model_parameters: BaseModel,
    config_params: list[ConfigParameter],
) -> Provider:
    return Provider(
        name=name,
        title=title,
        description=description,
        parameter_schema=llm_model_parameters.model_json_schema(),
        config_parameters=config_params,
    )


providers = [
    provider(
        LLMProvider.openrouter,
        "OpenRouter (Cloud)",
        "OpenRouter provides one API for any model. Access all major models through a single, unified interface. OpenAI SDK works out of the box.",
        OpenRouterParams,
        [ConfigParameter(key="openrouter_api_key", title="OpenRouter API key")],
    ),
    provider(
        LLMProvider.openai,
        "OpenAI (Cloud)",
        "Access all OpenAI models from the OpenAI API & SDK.",
        OpenAICloudParams,
        [ConfigParameter(key="openai_api_key", title="OpenAI API key")],
    ),
    provider(
        LLMProvider.local_llm_openai,
        "Local (OpenAI SDK)",
        "Use any locally-ran LLM that is compatible with the OpenAI SDK, e.g. Llama.cpp or LM Studio. Make sure that the model you are planning to use supports structured responses.",
        LocalOpenAISDKParams,
        [],
    ),
]
