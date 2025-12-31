from typing import TypeVar

from fastapi import Depends
from pydantic import BaseModel
from src.core.llm.providers.provider import BaseLLMParams, LLMProvider
from src.crud.setting_crud import SettingCrud
from src.services.setting_service import SettingService
from src.db.session import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from src.schemas.llm import ProviderRuntimeConfiguration
from src.core.llm.providers import llm_providers

T = TypeVar("T", bound=BaseModel)


class LLMService:
    def __init__(self, setting_service: SettingService, mock: bool = False):
        self._mock = mock
        self.setting_service = setting_service

    def get_llm(self, provider: str) -> type[LLMProvider]:
        Provider = next(
            prov for prov in llm_providers if prov.provider_name == provider
        )
        return Provider

    async def call_llm(
        self,
        llm: type[LLMProvider],
        schema: type[T],
        runtime_configuration: ProviderRuntimeConfiguration,
        model_configuration: BaseLLMParams,
        prompt: str,
    ):
        response_formatted, response_raw = await llm(
            runtime_configuration
        ).generate_answer_async(
            configuration=model_configuration, prompt=prompt, schema=schema
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
