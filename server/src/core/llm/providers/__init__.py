from typing import List

from src.core.config import settings
from src.core.llm.providers.jev import JevProvider
from src.core.llm.providers.local_openai_sdk import LocalOpenAISDKProvider
from src.core.llm.providers.mock import MockProvider
from src.core.llm.providers.openai import OpenAIProvider
from src.core.llm.providers.openrouter import OpenRouterProvider
from src.core.llm.providers.provider import LLMProvider

# The local OpenAI SDK provider makes the backend call an arbitrary
# user-supplied URL, so it is only offered when running locally: outside
# production, or in local mode (LOCAL_ENV), which is production on the user's
# own machine.
LOCAL_PROVIDER_DISABLED_ENVS = ("production", "prod", "staging")

llm_providers: List[type[LLMProvider]] = [
    OpenRouterProvider,
    OpenAIProvider,
    *(
        [LocalOpenAISDKProvider]
        if settings.LOCAL_ENV or settings.APP_ENV not in LOCAL_PROVIDER_DISABLED_ENVS
        else []
    ),
    JevProvider,
    MockProvider,
]
