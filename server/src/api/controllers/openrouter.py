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
    try:
        models = openrouter.get_available_models()
        data = models["data"]
        models["data"] = list(
            filter(
                lambda model: all(
                    item in (model.get("supported_parameters") or [])
                    for item in required_parameters
                ),
                data,
            )
        )

        return models
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve available models: {str(e)}",
        )
