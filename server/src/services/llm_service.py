from typing import Any, TypeVar

from fastapi import Depends
from pydantic import BaseModel
from src.core.llm.providers.provider import LLMProvider
from src.crud.setting_crud import SettingCrud
from src.services.setting_service import SettingService
from src.db.session import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from src.schemas.llm import ProviderRuntimeParameters
from src.core.llm.providers import llm_providers

T = TypeVar("T", bound=BaseModel)


class LLMService:
    def __init__(self, setting_service: SettingService, mock: bool = False):
        self._mock = mock
        self.setting_service = setting_service

    def get_llm(self, provider_name: str) -> type[LLMProvider]:
        Provider = next(
            prov for prov in llm_providers if prov.provider_name == provider_name
        )
        return Provider  # type: ignore

    async def call_llm(
        self,
        llm: type[LLMProvider],
        response_schema: type[T],
        provider_parameters: dict[str, Any],
        runtime_parameters: ProviderRuntimeParameters,
        model_parameters: dict[str, Any],
        user_prompt: str,
    ):
        response_formatted, response_raw = await llm(
            provider_parameters, runtime_parameters
        ).generate_answer_async(
            model_parameters=model_parameters,
            prompt=user_prompt,
            schema=response_schema,
        )
        return response_formatted


def create_llm_service(db_ctx: DBContext) -> LLMService:
    return LLMService(db_ctx.crud(SettingService))
