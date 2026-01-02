from typing import Any, Dict, List, Optional
from src.core.llm.providers import llm_providers
from pydantic import BaseModel
from fastapi import APIRouter, Body, Depends, HTTPException, status

from src.core.llm.providers.provider import ConfigParameter, LLMProvider, Provider
from src.schemas.llm import ProviderRuntimeParameters
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
            config_parameters=provider.config_parameters,
            model_parameters_json_schema=provider.model_parameters_schema.model_json_schema(),
            provider_parameters_json_schema=(
                provider.provider_parameters_schema.model_json_schema()
                if provider.provider_parameters_schema is not None
                else None
            ),
        )
        for provider in llm_providers
    ]


class ProviderConfigParamsResponse(BaseModel):
    title: str
    config_parameters: List[ConfigParameter]


@router.get(
    "/llm/provider_config_params",
    status_code=status.HTTP_200_OK,
    response_model=dict[str, ProviderConfigParamsResponse],
)
async def get_provider_config_params():
    return {
        provider.provider_name: ProviderConfigParamsResponse(
            title=provider.provider_title,
            config_parameters=provider.config_parameters,
        )
        for provider in llm_providers
    }


@router.post("/llm/{provider}/models", status_code=status.HTTP_200_OK)
async def get_available_models(
    provider: str,
    llmservice: LLMService = Depends(get_llm_service_fastapi),
    setting_service: SettingService = Depends(get_setting_service_fastapi),
    provider_parameters: Optional[Dict[str, Any]] = Body(None),
):
    llm_class: type[LLMProvider] = llmservice.get_llm(provider)
    api_key = None
    if llm_class.api_key_config_parameter is not None:
        setting = await setting_service.get_setting(
            llm_class.api_key_config_parameter.key, mask_secret=False
        )
        if setting is None:
            raise HTTPException(status_code=400, detail="API key missing")
        api_key = setting.value

    runtime_params = ProviderRuntimeParameters(api_key=api_key)

    if llm_class.provider_parameters_schema is not None:
        if provider_parameters is None:
            raise HTTPException(
                status_code=400,
                detail="Provider parameters are required for this provider",
            )
        try:
            llm_instance = llm_class(provider_parameters, runtime_params)
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid provider parameters: {str(e)}",
            )
    else:
        llm_instance = llm_class({}, runtime_params)

    return await llm_instance.get_available_models()
