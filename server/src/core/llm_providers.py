from enum import Enum
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


class Provider(BaseModel):
    name: str
    title: str
    description: str
    parameter_schema: dict


def provider(
    name: LLMProvider, title: str, description: str, parameters: BaseModel
) -> Provider:
    return Provider(
        name=name,
        title=title,
        description=description,
        parameter_schema=parameters.model_json_schema(),
    )


providers = [
    provider(
        LLMProvider.openrouter,
        "OpenRouter (Cloud)",
        "OpenRouter provides one API for any model. Access all major models through a single, unified interface. OpenAI SDK works out of the box.",
        OpenRouterParams,
    ),
    provider(
        LLMProvider.openai,
        "OpenAI (Cloud)",
        "Access all OpenAI models from the OpenAI API & SDK.",
        OpenAICloudParams,
    ),
    provider(
        LLMProvider.local_llm_openai,
        "Local (OpenAI SDK)",
        "Use any locally-ran LLM that is compatible with the OpenAI SDK, e.g. Llama.cpp or LM Studio. Make sure that the model you are planning to use supports structured responses.",
        LocalOpenAISDKParams,
    ),
]
