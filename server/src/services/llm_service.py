from typing import Any, TypeVar

from httpx import AsyncClient
from pydantic import BaseModel

from src.core.llm.providers import llm_providers
from src.core.llm.providers.provider import LLMProvider
from src.db.db_context import DBContext
from src.schemas.llm import ProviderRuntimeParameters
from src.services.setting_service import SettingService, create_setting_service

T = TypeVar("T", bound=BaseModel)


class LLMService:
    def __init__(self, setting_service: SettingService, mock: bool = False):
        self._mock = mock
        self.setting_service = setting_service

    def get_llm(self, provider_name: str) -> type[LLMProvider]:
        Provider = next(
            (prov for prov in llm_providers if prov.provider_name == provider_name),
            None
        )
        if Provider is None:
            raise ValueError(f"Unknown provider: {provider_name}")
        return Provider  # type: ignore

    async def call_llm(
        self,
        llm: type[LLMProvider],
        response_schema: type[T],
        provider_parameters: dict[str, Any],
        runtime_parameters: ProviderRuntimeParameters,
        model_parameters: dict[str, Any],
        user_prompt: str,
        client: AsyncClient,
    ) -> T:
        response_formatted = await llm(
            provider_parameters, runtime_parameters
        ).generate_answer_async(
            model_parameters=model_parameters,
            prompt=user_prompt,
            schema=response_schema,
            client=client,
        )
        return response_formatted
    
    async def embed(
        self,
        llm: type[LLMProvider],
        provider_parameters: dict[str, Any],
        runtime_parameters: ProviderRuntimeParameters,
        texts: list[str],
        client: AsyncClient,
    ) -> list[list[float]]:
        embedding = await llm(
            provider_parameters, runtime_parameters
        ).embed_async(
            client=client,
            texts=texts,
        )
        return embedding


def create_llm_service(db_ctx: DBContext) -> LLMService:
    setting_service = create_setting_service(db_ctx)
    return LLMService(setting_service)
