from fastapi import APIRouter, status
from fastapi.exceptions import HTTPException
from fastapi import Depends
from src.core.config import settings
from src.models.openrouter import OpenrouterModelResponse
from src.services.openrouter_service import OpenRouterService, get_openrouter_service_fastapi

router = APIRouter()


@router.get(
    "/openrouter/models",
    status_code=status.HTTP_200_OK,
    response_model=OpenrouterModelResponse,
)
async def get_available_models(
    openrouter: OpenRouterService = Depends(get_openrouter_service_fastapi),
):
    required_parameters = [
        "structured_outputs",
        "response_format",
        "temperature",
        "top_p",
        "seed",
    ]
    valid_model_names = [
        "Mistral: Mistral Medium 3.1",
        "Mistral: Codestral 2508",
        "Google: Gemini 2.5 Flash Lite Preview 06-17",
        "xAI: Grok 4",
        "Mistral: Mistral Small 3.2 24B",
        "Google: Gemini 2.5 Flash Lite Preview 06-17",
        "Google: Gemini 2.5 Flash",
        "Google: Gemini 2.5 Pro",
        "xAI: Grok 3 Mini",
        "xAI: Grok 3",
        "Mistral: Magistral Small 2506",
        "Mistral: Magistral Medium 2506",
        "Mistral: Magistral Medium 2506 (thinking)",
        "Google: Gemini 2.5 Pro Preview 06-05",
        "DeepSeek: R1 0528",
        "Mistral: Mistral Medium 3",
        "Google: Gemini 2.5 Pro Preview 05-06",
        "OpenAI: GPT-4.1",
        "OpenAI: GPT-4.1 Mini",
        "OpenAI: GPT-4.1 Nano",
        "Meta: Llama 4 Maverick",
        "DeepSeek: DeepSeek V3 0324",
        "Mistral: Mistral Small 3.1 24B",
        "Google: Gemini 2.0 Flash Lite",
        "Mistral: Saba",
        "Google: Gemini 2.0 Flash",
        "Mistral: Mistral Small 3",
        "Mistral: Codestral 2501",
        "Cohere: Command R7B (12-2024)",
        "Meta: Llama 3.3 70B Instruct",
        "OpenAI: GPT-4o (2024-11-20)",
        "Mistral Large 2411",
        "Mistral Large 2407",
        "Mistral: Ministral 8B",
        "Mistral: Ministral 3B",
        "Google: Gemini 1.5 Flash 8B",
        "Mistral: Pixtral 12 B",
        "Cohere: Command R+ (08-2024)",
        "Cohere: Command R (08-2024)",
        "OpenAI: ChatGPT-4o (2024-08-06)",
        "OpenAI: GPT-4o-mini (2024-07-18)",
        "OpenAI: GPT-4o-mini",
        "Google: Gemini 1.5. Flash",
        "OpenAI: GPT-4o",
        "Mistral: Mixtral 8x22B Instruct",
        "Google: Gemini 1.5 Pro",
        "Cohere: Command R+",
        "Cohere: Command R+ (04-2024)",
        "Mistral Large",
        "Mistral Tiny",
        "Mistral Small",
    ]
    try:
        models = openrouter.get_available_models()
        data = models["data"]
        models["data"] = [
            model for model in data
            if model.get("name") in valid_model_names
            and all(param in (model.get("supported_parameters") or []) for param in required_parameters)
        ]
        models["data"] = sorted(models["data"], key=lambda model: model.get("name", "").lower())
        return models
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve available models: {str(e)}",
        )
