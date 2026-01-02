from typing import Any, List

from pydantic import BaseModel

from src.core.llm.providers.provider import (
    T,
    BaseLLMParams,
    ConfigParameter,
    LLMProvider,
)
from openai.types.model import Model

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
        key="openai_api_key", title="OpenAI API key"
    )
    config_parameters = [api_key_config_parameter]

    async def generate_answer_async(
        self, model_parameters: dict[str, Any], schema: type[T], prompt
    ) -> tuple[T, str]:
        model_cfg = self.parse_model_parameters(model_parameters)

        from openai import AsyncOpenAI
        import openai

        if self.runtime_parameters.model is None:
            raise RuntimeError("Model needs to be defined")

        if self.runtime_parameters.api_key is None:
            raise RuntimeError("API Key is not defined")

        async with AsyncOpenAI(api_key=self.runtime_parameters.api_key) as client:
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
                    text_format=schema,
                )
                if response.output_parsed is None:
                    raise RuntimeError("LLM response was empty")

                return response.output_parsed, ""
            except openai.APIConnectionError as e:
                print("The server could not be reached")
                print(e.__cause__)
                raise e
            except openai.RateLimitError as e:
                print("HTTP 429 status code was received; we should back off a bit.")
                print(e.status_code)
                print(e.response)
                raise e
            except openai.APIStatusError as e:
                print("Another non-200-range status code was received")
                print(e.status_code)
                print(e.response)
                raise e
            except Exception as e:
                raise RuntimeError("LLM call failed") from e

        raise RuntimeError("Failed to call LLM")

    async def get_available_models(self) -> List[Model]:
        from openai import AsyncOpenAI

        if self.runtime_parameters.api_key is None:
            raise RuntimeError("API key is not defined")
        async with AsyncOpenAI(api_key=self.runtime_parameters.api_key) as client:
            models = await client.models.list()
            return models.data
