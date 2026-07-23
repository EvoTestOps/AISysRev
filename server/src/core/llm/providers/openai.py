from typing import Any, List

from httpx import AsyncClient
from openai.types.model import Model
from pydantic import BaseModel
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIResponsesModel, OpenAIResponsesModelSettings
from pydantic_ai.output import ToolOutput
from pydantic_ai.providers.openai import OpenAIProvider as PAI_OpenAIProvider

from src.core.llm.providers.provider import (
    BaseLLMParams,
    ConfigParameter,
    LLMProvider,
    T,
)
from src.schemas.llm import ProviderRuntimeParameters


class EmptyProviderParams(BaseModel):
    pass


class OpenAIModelParams(BaseLLMParams):
    pass


class OpenAIProvider(LLMProvider[EmptyProviderParams, OpenAIModelParams]):
    def __init__(
        self, provider_params: dict[str, Any], runtime_config: ProviderRuntimeParameters
    ):
        super().__init__(provider_params, runtime_config)

    provider_title = "OpenAI (Cloud)"
    provider_name = "openai"
    provider_description = "Access all OpenAI models from the OpenAI API & SDK."

    model_parameters_schema = OpenAIModelParams
    api_key_config_parameter = ConfigParameter(
        key="openai_api_key",
        title="OpenAI API key",
        description="The OpenAI API requires an API key for model access.",
    )
    config_parameters = [api_key_config_parameter]

    async def generate_answer_async(
        self,
        client: AsyncClient,
        model_parameters: dict[str, Any],
        schema: type[T],
        prompt,
    ) -> T:
        model_cfg = self.parse_model_parameters(model_parameters)

        if self.runtime_parameters.model is None:
            raise RuntimeError("Model needs to be defined")

        if self.runtime_parameters.api_key is None:
            raise RuntimeError("API Key is not defined")

        settings = OpenAIResponsesModelSettings(
            extra_headers={
                "X-Title": "AISysRev",
                "HTTP-Referer": "https://github.com/EvoTestOps/AISysRev",
            },
            temperature=model_cfg.temperature,
            top_p=model_cfg.top_p,
        )

        model = OpenAIResponsesModel(
            str(self.runtime_parameters.model),
            provider=PAI_OpenAIProvider(
                api_key=self.runtime_parameters.api_key, http_client=client
            ),
            settings=settings,
        )

        agent = Agent(
            model,
            system_prompt=self.runtime_parameters.system_prompt,
            retries=3,
            output_retries=5,
            output_type=ToolOutput(schema, name=schema.__name__.lower()),
        )

        result = await agent.run(prompt)

        return result.output

    async def get_available_models(self) -> List[Model]:
        from openai import AsyncOpenAI

        if self.runtime_parameters.api_key is None:
            raise RuntimeError("API key is not defined")
        async with AsyncOpenAI(api_key=self.runtime_parameters.api_key) as client:
            models = await client.models.list()
            return models.data
    
    async def embed_async(
        self,
        client: AsyncClient,
        texts: list[str],
    ) -> list[list[float]]:
        if self.runtime_parameters.api_key is None:
            raise RuntimeError("API key is not defined")
        
        from openai import AsyncOpenAI

        openai_client = AsyncOpenAI(
            api_key=self.runtime_parameters.api_key,
            http_client=client,
        )
        response = await openai_client.embeddings.create(
            model="text-embedding-3-small",
            input=texts,
        )
        return [item.embedding for item in response.data]
        
