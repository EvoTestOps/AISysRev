from src.models.openrouter import OpenrouterModelResponse


class OpenRouterService:
    def get_available_models(self) -> OpenrouterModelResponse:
        import json

        with open("/app/src/data/openrouter_models_1755156279.json") as f:
            parsed = json.load(f)
            return parsed


def get_openrouter_service() -> OpenRouterService:
    return OpenRouterService()
