from src.schemas.llm import LLMConfiguration
from src.core.llm import OpenRouterLLM
from src.core.config import settings
from src.models.openrouter import OpenrouterModelResponse


class OpenRouterService:
    def get_available_models(self) -> OpenrouterModelResponse:
        import json

        with open("/app/src/data/openrouter_models_1755156279.json") as f:
            parsed = json.load(f)
            return parsed

    async def call_llm(self):
        llm_configuration = LLMConfiguration(
            base_url=settings.LLM_PROVIDER_BASE_URL, api_key=""
        )
        llm = OpenRouterLLM(config=llm_configuration)
        response_formatted, response_raw = await llm.generate_answer_async(
            "PROMPT GOES HERE"
        )
        return response_formatted


def get_openrouter_service() -> OpenRouterService:
    return OpenRouterService()
