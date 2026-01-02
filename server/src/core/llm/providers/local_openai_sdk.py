from typing import Any, List, Type

from pydantic import BaseModel, Field

from src.core.llm.providers.provider import T, BaseLLMParams, LLMProvider
from openai.types.model import Model


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
        self, model_parameters: dict[str, Any], schema: Type[T], prompt: str
    ) -> tuple[T, str]:
        model_cfg = self.parse_model_parameters(model_parameters)

        from openai import AsyncOpenAI

        if self.provider_parameters is None:
            raise RuntimeError("Provider parameters needs to be defined")

        if self.runtime_parameters.model is None:
            raise RuntimeError("Model needs to be defined")

        async with AsyncOpenAI(
            api_key="Foo",
            base_url=self.provider_parameters.base_url,
        ) as client:
            try:
                response = await client.responses.parse(
                    model=self.runtime_parameters.model,
                    input=[
                        {
                            "role": "system",
                            "content": self.runtime_parameters.system_prompt,
                        },
                        {"role": "user", "content": prompt},
                    ],
                    top_p=model_cfg.top_p,
                    temperature=model_cfg.temperature,
                    # Structured Outputs is available in OpenAI's latest large language models, starting with GPT-4o
                    text_format=schema,
                )
                if response.output_parsed is None:
                    raise RuntimeError("Output from LLM was empty")
                return response.output_parsed, ""
            except Exception as e:
                raise RuntimeError("LLM call failed") from e

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
