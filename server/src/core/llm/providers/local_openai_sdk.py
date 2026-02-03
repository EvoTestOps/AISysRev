from typing import Any, List, Type

from httpx import AsyncClient
from openai.types.model import Model
from pydantic import BaseModel, Field
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIResponsesModel, OpenAIResponsesModelSettings
from pydantic_ai.output import ToolOutput
from pydantic_ai.providers.openai import OpenAIProvider as PAI_OpenAIProvider

from src.core.llm.providers.provider import BaseLLMParams, LLMProvider, T


class LocalOpenAISDKProviderParams(BaseModel):
    base_url: str = Field(
        title="Base URL", default="http://host.docker.internal:1234/v1"
    )


class LocalOpenAISDKModelParams(BaseLLMParams):
    pass


class LocalOpenAISDKProvider(
    LLMProvider[LocalOpenAISDKProviderParams, LocalOpenAISDKModelParams]
):
    provider_title = "Local (OpenAI SDK)"
    provider_name = "local-openai-sdk"
    provider_description = "Use any locally-ran LLM that is compatible with the OpenAI SDK, e.g. Llama.cpp or LM Studio. Make sure that the model you are planning to use supports structured responses."
    provider_parameters_schema = LocalOpenAISDKProviderParams

    model_parameters_schema = LocalOpenAISDKModelParams
    api_key_config_parameter = None
    config_parameters = []

    async def generate_answer_async(
        self,
        model_parameters: dict[str, Any],
        schema: Type[T],
        prompt: str,
        client: AsyncClient,
    ) -> T:
        model_cfg = self.parse_model_parameters(model_parameters)

        if self.provider_parameters is None:
            raise RuntimeError("Provider parameters needs to be defined")

        if self.runtime_parameters.model is None:
            raise RuntimeError("Model needs to be defined")

        provider = PAI_OpenAIProvider(
            api_key="Foo",
            base_url=self.provider_parameters.base_url,
            http_client=client,
        )

        settings = OpenAIResponsesModelSettings(
            temperature=model_cfg.temperature,
            top_p=model_cfg.top_p,
        )

        model = OpenAIResponsesModel(
            str(self.runtime_parameters.model),
            provider=provider,
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

        if result.output is None:
            raise RuntimeError("Output from LLM was empty")

        return result.output

    async def get_available_models(self) -> List[Model]:
        if self.provider_parameters is None:
            raise RuntimeError("Provider parameters needs to be defined")

        from openai import AsyncOpenAI

        async with AsyncOpenAI(
            api_key="Foo",
            base_url=self.provider_parameters.base_url,
        ) as client:
            models = await client.models.list()
            return models.data
