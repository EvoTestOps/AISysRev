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

    def get_llm(
        self, provider: str, runtime_configuration: ProviderRuntimeConfiguration
    ) -> LLMProvider:
        Provider = next(
            prov for prov in llm_providers if prov.provider_name == provider
        )
        return Provider(runtime_configuration)

    async def call_llm(
        self, schema: type[T], config: BaseLLMParams, prompt: str, api_key: str
    ):
        llm = self.get_llm(config)
        response_formatted, response_raw = await llm.generate_answer_async(
            api_key="", configuration=config, prompt=prompt, schema=schema
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
