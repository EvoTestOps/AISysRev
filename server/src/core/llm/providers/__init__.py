from typing import List

from src.core.llm.providers.local_openai_sdk import LocalOpenAISDKProvider
from src.core.llm.providers.mock import MockProvider
from src.core.llm.providers.openai import OpenAIProvider
from src.core.llm.providers.openrouter import OpenRouterProvider
from src.core.llm.providers.provider import LLMProvider

llm_providers: List[type[LLMProvider]] = [
    OpenRouterProvider,
    OpenAIProvider,
    LocalOpenAISDKProvider,
    MockProvider,
]
