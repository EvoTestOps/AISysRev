from typing import List

from src.core.llm.providers.openai import OpenAIProvider
from src.core.llm.providers.local_openai_sdk import LocalOpenAISDKProvider
from src.core.llm.providers.openrouter import OpenRouterProvider
from src.core.llm.providers.provider import LLMProvider

llm_providers: List[LLMProvider] = [
    OpenRouterProvider,
    OpenAIProvider,
    LocalOpenAISDKProvider,
]
