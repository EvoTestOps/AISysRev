from typing import Any, List, Type

from httpx import AsyncClient
from openai.types.model import Model
from pydantic import BaseModel, Field
from pydantic_ai import Agent
from pydantic_ai.models.openrouter import (
    OpenRouterModel,
    OpenRouterModelSettings,
    OpenRouterProviderConfig,
)
from pydantic_ai.output import ToolOutput
from pydantic_ai.providers.openrouter import (
    OpenRouterProvider as PAI_OpenRouterProvider,
)

from src.core.llm.providers.provider import (
    BaseLLMParams,
    ConfigParameter,
    LLMProvider,
    T,
)
from src.schemas.llm import (
    ProviderRuntimeParameters,
)


class OpenRouterProviderParams(BaseModel):
    zdr: bool = Field(
        default=False,
        title="Zero Data Retention (ZDR)",
        description=(
            "Restrict routing to only providers that guarantee Zero Data "
            "Retention. This may reduce the set of available models/providers."
        ),
    )


class OpenRouterModelParams(BaseLLMParams):
    pass


class OpenRouterProvider(LLMProvider[OpenRouterProviderParams, OpenRouterModelParams]):
    def __init__(
        self,
        provider_parameters: dict[str, Any],
        runtime_config: ProviderRuntimeParameters,
    ):
        super().__init__(provider_parameters, runtime_config)

    provider_title = "OpenRouter (Cloud)"
    provider_name = "openrouter"
    provider_description = "OpenRouter provides one API for any model. Access all major models through a single, unified interface. OpenAI SDK works out of the box."
    provider_parameters_schema = OpenRouterProviderParams

    model_parameters_schema = OpenRouterModelParams

    api_key_config_parameter = ConfigParameter(
        key="openrouter_api_key",
        title="OpenRouter API key",
        description="OpenRouter API key is used to authenticate requests to the OpenRouter API.",
    )
    config_parameters = [api_key_config_parameter]

    def _build_openrouter_provider_settings(self) -> OpenRouterProviderConfig:
        if self.provider_parameters is None:
            raise RuntimeError("Provider parameters needs to be defined")

        openrouter_provider: OpenRouterProviderConfig = {
            "require_parameters": True,
            "data_collection": "deny",
        }
        if self.provider_parameters.zdr:
            openrouter_provider["zdr"] = True
        return openrouter_provider

    async def generate_answer_async(
        self,
        client: AsyncClient,
        model_parameters: dict[str, Any],
        schema: Type[T],
        prompt: str,
    ) -> T:
        import logging

        logger = logging.getLogger(__name__)

        model_cfg = self.parse_model_parameters(model_parameters)

        if self.runtime_parameters.api_key is None:
            raise RuntimeError("API Key is not defined")
        if self.provider_parameters is None:
            raise RuntimeError("Provider parameters needs to be defined")

        settings = OpenRouterModelSettings(
            openrouter_provider=self._build_openrouter_provider_settings(),
            extra_headers={
                "X-Title": "AISysRev",
                "HTTP-Referer": "https://github.com/EvoTestOps/AISysRev",
            },
            temperature=model_cfg.temperature,
            top_p=model_cfg.top_p,
        )

        model = OpenRouterModel(
            str(self.runtime_parameters.model),
            provider=PAI_OpenRouterProvider(
                api_key=self.runtime_parameters.api_key, http_client=client
            ),
            settings=settings,
        )

        agent = Agent(
            model,
            system_prompt=self.runtime_parameters.system_prompt,
            retries={"tools": 3, "output": 5},  # TODO: Maybe should be configurable
            output_type=ToolOutput(schema, name=schema.__name__.lower()),
        )

        logger.debug(
            "Sending prompt to OpenRouter model %s", self.runtime_parameters.model
        )
        logger.debug("Prompt: %s", prompt)
        logger.debug("Model parameters: %s", model_cfg.model_dump())

        result = await agent.run(prompt)

        logger.debug("Received structured response: %s", result.output)
        return result.output

    async def get_available_models(self) -> List[Model]:
        if self.provider_parameters is None:
            raise RuntimeError("Provider parameters needs to be defined")

        if self.runtime_parameters.api_key is None:
            raise RuntimeError("API Key is not defined")

        import aiohttp

        required_parameters = [
            "structured_outputs",
            "response_format",
            "temperature",
            "top_p",
        ]
        headers = {
            "Authorization": f"Bearer {self.runtime_parameters.api_key}",
            "Content-type": "application/json",
        }
        async with aiohttp.ClientSession() as session:
            if self.provider_parameters.zdr:
                # /models has no ZDR filter; the dedicated ZDR endpoints list
                # is the only way to restrict the model list to endpoints
                # that guarantee Zero Data Retention.
                async with session.get(
                    "https://openrouter.ai/api/v1/endpoints/zdr",
                    headers=headers,
                ) as response:
                    body = await response.json()
                    endpoints = body["data"]

                seen_model_ids: set[str] = set()
                models: List[Model] = []
                for endpoint in endpoints:
                    model_id = endpoint["model_id"]
                    if model_id in seen_model_ids:
                        continue
                    supported = endpoint.get("supported_parameters", [])
                    if not all(param in supported for param in required_parameters):
                        continue
                    seen_model_ids.add(model_id)
                    models.append(
                        Model(
                            id=model_id,
                            created=0,
                            object="model",
                            owned_by=endpoint.get("provider_name", ""),
                        )
                    )
                return models

            async with session.get(
                f"https://openrouter.ai/api/v1/models?supported_parameters={','.join(required_parameters)}",
                headers=headers,
            ) as response:
                body = await response.json()
                models_data = body["data"]
                return [
                    Model(
                        id=model["id"],
                        created=model["created"],
                        object="model",
                        owned_by=model["canonical_slug"],
                    )
                    for model in models_data
                ]

    async def embed_async(
        self,
        client: AsyncClient,
        texts: list[str],
    ) -> list[list[float]]:
        if self.runtime_parameters.api_key is None:
            raise RuntimeError("API Key is not defined")
        if self.provider_parameters is None:
            raise RuntimeError("Provider parameters needs to be defined")

        from openai import AsyncOpenAI

        openai_client = AsyncOpenAI(
            api_key=self.runtime_parameters.api_key,
            base_url="https://openrouter.ai/api/v1",
        )
        extra_body: dict[str, Any] = {}
        if self.provider_parameters.zdr:
            extra_body["provider"] = {"zdr": True}

        response = await openai_client.embeddings.create(
            model="openai/text-embedding-3-small",
            input=texts,
            extra_body=extra_body or None,
        )
        return [item.embedding for item in response.data]
