from typing import List

from src.core.llm.providers.provider import (
    T,
    BaseLLMParams,
    ConfigParameter,
    LLMProvider,
)
from openai.types.model import Model

from src.schemas.llm import ProviderRuntimeConfiguration


class OpenAIModelParams(BaseLLMParams):
    pass


class OpenAIProvider(LLMProvider):
    def __init__(self, runtime_config: ProviderRuntimeConfiguration):
        super().__init__(runtime_config)

    provider_title = "OpenAI (Cloud)"
    provider_name = "openai"
    provider_base_url = "https://api.openai.com/v1"
    provider_description = "Access all OpenAI models from the OpenAI API & SDK."
    provider_model_parameters = OpenAIModelParams
    api_key_config_parameter = ConfigParameter(
        key="openai_api_key", title="OpenAI API key"
    )
    provider_config_parameters = [api_key_config_parameter]

    @property
    def config(self) -> ProviderRuntimeConfiguration:
        return self._config

    async def generate_answer_async(
        self, configuration: BaseLLMParams, schema: type[T], prompt
    ) -> tuple[T, str]:
        from openai import AsyncOpenAI
        import openai

        if self.config.api_key is None:
            raise RuntimeError("API Key is not defined")

        async with AsyncOpenAI(api_key=self.config.api_key) as client:
            try:
                response = await client.responses.parse(
                    model=self.config.model,
                    input=[
                        (
                            {
                                "role": "system",
                                "content": self.config.system_prompt,
                            }
                        ),
                        {"role": "user", "content": prompt},
                    ],
                    seed=configuration.seed,
                    top_p=configuration.top_p,
                    temperature=configuration.temperature,
                    # Structured Outputs is available in OpenAI's latest large language models, starting with GPT-4o
                    text_format=schema,
                )
                return response.output_parsed, None
            except openai.APIConnectionError as e:
                print("The server could not be reached")
                print(e.__cause__)
            except openai.RateLimitError as e:
                print("HTTP 429 status code was received; we should back off a bit.")
                print(e.status_code)
                print(e.response)
            except openai.APIStatusError as e:
                print("Another non-200-range status code was received")
                print(e.status_code)
                print(e.response)

        return None, None

    async def get_available_models(self) -> List[Model]:
        from openai import AsyncOpenAI

        async with AsyncOpenAI(api_key=self.config.api_key) as client:
            models = await client.models.list()
            return models.data
