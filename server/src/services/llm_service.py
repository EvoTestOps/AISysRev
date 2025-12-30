from typing import Optional, TypeVar

from fastapi import Depends
from pydantic import BaseModel
from src.core.llm_providers import LLMProvider
from src.crud.setting_crud import SettingCrud
from src.schemas.job import LLMModelConfig
from src.services.setting_service import SettingService
from src.db.session import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from src.schemas.llm import LLMConfiguration
from src.core.llm import LLM, OpenAiSDKLLM, OpenRouterLLM

T = TypeVar("T", bound=BaseModel)


class LLMService:
    def __init__(self, setting_service: SettingService, mock: bool = False):
        self._mock = mock
        self.setting_service = setting_service

    def get_base_url(self, configuration: LLMModelConfig) -> str:
        defaults: dict[LLMProvider, Optional[str]] = {
            LLMProvider.openrouter: "https://openrouter.ai/api/v1",
            LLMProvider.openai: "https://api.openai.com/v1/chat/completions",
            LLMProvider.openai_local: None,
        }

        try:
            default = defaults[configuration.provider_name]
        except KeyError:
            raise RuntimeError(f"Unknown provider {configuration.provider_name}")

        if configuration.base_url:
            return configuration.base_url

        if default is None:
            raise RuntimeError("No base_url configured for provider {configuration.provider_name}")

        return default

    def get_llm(self, configuration: LLMModelConfig, api_key: str) -> LLM:
        config = LLMConfiguration(
            base_url=self.get_base_url(configuration),
            api_key=api_key,
            model=configuration.model_name,
            seed=configuration.seed,
            top_p=configuration.top_p,
            temperature=configuration.temperature,
        )
        # Currently we support openrouter and openai as providers. Local models should work fine.
        if configuration.provider_name == LLMProvider.openrouter:
            return OpenRouterLLM(config)
        if configuration.provider_name == LLMProvider.openai:
            return OpenAiSDKLLM(config)
        if configuration.provider_name == LLMProvider.openai_local:
            return OpenAiSDKLLM(config)
        raise RuntimeError("Unknown LLM provider")

    async def call_llm(
        self, schema: type[T], config: LLMModelConfig, prompt: str, api_key: str
    ):
        llm = self.get_llm(config, api_key)
        response_formatted, response_raw = await llm.generate_answer_async(
            schema, prompt
        )
        return response_formatted


def get_llm_service(db: AsyncSession) -> LLMService:
    setting_crud = SettingCrud(db)
    setting_service = SettingService(db, setting_crud)
    return LLMService(setting_service)


def get_llm_service_fastapi(
    db: AsyncSession = Depends(get_db),
) -> LLMService:
    setting_crud = SettingCrud(db)
    setting_service = SettingService(db, setting_crud)
    return LLMService(setting_service)
