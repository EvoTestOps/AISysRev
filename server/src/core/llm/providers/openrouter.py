from typing import Any, List, Type

from httpx import AsyncClient
from openai.types.model import Model
from pydantic import BaseModel
from pydantic_ai import Agent
from pydantic_ai.models.openrouter import OpenRouterModel, OpenRouterModelSettings
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
    pass


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
            openrouter_provider={
                "require_parameters": True,
                "data_collection": "deny",
            },
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
            retries=3,  # TODO: Maybe should be configurable
            output_retries=5,
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
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"https://openrouter.ai/api/v1/models?supported_parameters={','.join(required_parameters)}",
                headers={
                    "Authorization": f"Bearer {self.runtime_parameters.api_key}",
                    "Content-type": "application/json",
                },
            ) as response:
                body = await response.json()
                models = body["data"]
                return [
                    Model(
                        id=model["id"],
                        created=model["created"],
                        object="model",
                        owned_by=model["canonical_slug"],
                    )
                    for model in models
                ]

    async def embed_async(
        self,
        client: AsyncClient,
        texts: list[str],
    ) -> list[list[float]]:
        if self.runtime_parameters.api_key is None:
            raise RuntimeError("API Key is not defined")

        from openai import AsyncOpenAI

        openai_client = AsyncOpenAI(
            api_key=self.runtime_parameters.api_key,
            base_url="https://openrouter.ai/api/v1",
            http_client=client,
        )
        response = await openai_client.embeddings.create(
            model="openai/text-embedding-3-small",
            input=texts,
        )
        return [item.embedding for item in response.data]
