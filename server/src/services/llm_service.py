from typing import Any, TypeVar
from uuid import UUID

from httpx2 import AsyncClient
from pydantic import BaseModel

from src.core.llm.providers import llm_providers
from src.core.llm.providers.provider import LLMProvider
from src.db.db_context import DBContext
from src.schemas.llm import ProviderRuntimeParameters
from src.services.setting_service import SettingService, create_setting_service

T = TypeVar("T", bound=BaseModel)


def _config_value_to_str(value: str | int | float | bool) -> str:
    # Settings are stored as strings, and booleans as "true"/"false".
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value)


class LLMService:
    def __init__(self, setting_service: SettingService, mock: bool = False):
        self._mock = mock
        self.setting_service = setting_service

    def get_llm(self, provider_name: str) -> type[LLMProvider]:
        Provider = next(
            (prov for prov in llm_providers if prov.provider_name == provider_name),
            None,
        )
        if Provider is None:
            raise ValueError(f"Unknown provider: {provider_name}")
        return Provider  # type: ignore

    async def resolve_provider_parameters(
        self,
        llm: type[LLMProvider],
        provider_parameters: dict[str, Any],
        owner_uuid: UUID,
    ) -> dict[str, Any]:
        """
        Merges a user's global (non-secret) config_parameters (e.g. a
        "force ZDR" toggle set on the Settings page) into a job's
        provider_parameters, letting providers override per-job settings.

        A parameter the user has not set falls back to the parameter's
        defaultValue (if it has one), so the default applies exactly as if the
        user had saved it.
        """
        global_config: dict[str, str] = {}
        for param in llm.config_parameters:
            if param is llm.api_key_config_parameter or param.secret:
                continue
            if param.defaultValue is not None:
                global_config[param.key] = _config_value_to_str(param.defaultValue)
            setting = await self.setting_service.get_setting(
                param.key, owner_uuid=owner_uuid, mask_secret=False
            )
            if setting is not None:
                global_config[param.key] = setting.value
        return llm.apply_global_config_overrides(provider_parameters, global_config)

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
        embedding = await llm(provider_parameters, runtime_parameters).embed_async(
            client=client,
            texts=texts,
        )
        return embedding


def create_llm_service(db_ctx: DBContext) -> LLMService:
    setting_service = create_setting_service(db_ctx)
    return LLMService(setting_service)
