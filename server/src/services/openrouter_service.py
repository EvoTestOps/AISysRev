from typing import TypeVar

from fastapi import Depends
from pydantic import BaseModel
from src.crud.setting_crud import SettingCrud
from src.services.setting_service import SettingService
from src.db.session import AsyncSessionLocal, get_db
from sqlalchemy.ext.asyncio import AsyncSession
from src.schemas.llm import LLMConfiguration
from src.core.llm import MockLLM, OpenRouterLLM
from src.core.config import settings
from src.models.openrouter import OpenrouterModelResponse

T = TypeVar("T", bound=BaseModel)


class OpenRouterService:
    def __init__(self, setting_service: SettingService, mock: bool = False):
        self._mock = mock
        self.setting_service = setting_service

    def get_available_models(self) -> OpenrouterModelResponse:
        import json

        with open(
            "/app/src/data/openrouter_models_1755156279.json", mode="r", encoding="utf8"
        ) as f:
            parsed = json.load(f)
            return parsed

    async def call_llm(self, schema: type[T], model: str, prompt: str):
        openrouter_api_key = await self.setting_service.get_setting(
            name="openrouter_api_key", mask_secret=False
        )
        if openrouter_api_key is None:
            raise RuntimeError("OpenRouter API key is undefined")

        llm_configuration = LLMConfiguration(
            base_url=settings.LLM_PROVIDER_BASE_URL,
            model=model,
            api_key=openrouter_api_key.value,
        )
        llm = (
            OpenRouterLLM(config=llm_configuration)
            if not self._mock
            else MockLLM(config=llm_configuration)
        )
        response_formatted, response_raw = await llm.generate_answer_async(
            schema, prompt
        )
        return response_formatted


def get_openrouter_service(db: AsyncSession) -> OpenRouterService:
    setting_crud = SettingCrud(db)
    setting_service = SettingService(db, setting_crud)
    return OpenRouterService(setting_service)


def get_openrouter_service_fastapi(db: AsyncSession = Depends(get_db)) -> OpenRouterService:
    setting_crud = SettingCrud(db)
    setting_service = SettingService(db, setting_crud)
    return OpenRouterService(setting_service)
