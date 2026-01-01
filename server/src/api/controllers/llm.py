from src.core.llm.providers import llm_providers
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status

from src.core.llm.providers.provider import ConfigParameter, Provider
from src.schemas.llm import ProviderRuntimeConfiguration
from src.services.llm_service import LLMService, get_llm_service_fastapi
from src.services.setting_service import (
    SettingService,
    get_setting_service_fastapi,
)

router = APIRouter()


@router.get("/llm/providers", status_code=status.HTTP_200_OK)
async def get_providers() -> list[Provider]:
    return [
        Provider(
            title=provider.provider_title,
            description=provider.provider_description,
            name=provider.provider_name,
            model_parameters=provider.provider_model_parameters.model_json_schema(),
            config_parameters=provider.provider_config_parameters,
        )
        for provider in llm_providers
    ]


class ProviderConfigParamsResponse(BaseModel):
    title: str
    config_parameters: list[ConfigParameter]


@router.get(
    "/llm/provider_config_params",
    status_code=status.HTTP_200_OK,
    response_model=dict[str, ProviderConfigParamsResponse],
)
async def get_provider_config_params() -> dict[str, list[ConfigParameter]]:
    return {
        provider.provider_name: ProviderConfigParamsResponse(
            title=provider.provider_title,
            config_parameters=provider.provider_config_parameters,
        )
        for provider in llm_providers
    }


@router.get("/llm/{provider}/models", status_code=status.HTTP_200_OK)
async def get_available_models(
    provider: str,
    llmservice: LLMService = Depends(get_llm_service_fastapi),
    setting_service: SettingService = Depends(get_setting_service_fastapi),
):
    llm = llmservice.get_llm(provider)
    # If we do not require an API key, we can skip this
    if llm.api_key_config_parameter is None:
        llm_instance = llm(ProviderRuntimeConfiguration())
        return await llm_instance.get_available_models()
    else:
        # Do not mask the secret, otherwise the API key is just a fixed length string of asterisks
        api_key = await setting_service.get_setting(
            llm.api_key_config_parameter.key, mask_secret=False
        )
        if api_key is None:
            raise HTTPException(status_code=400, detail="API key missing")
        llm_instance = llm(ProviderRuntimeConfiguration(api_key=api_key.value))
        return await llm_instance.get_available_models()
