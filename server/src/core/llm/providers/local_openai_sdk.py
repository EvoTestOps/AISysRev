from typing import List, Type

from src.core.llm.providers.provider import T, BaseLLMParams, LLMProvider

from src.schemas.llm import (
    ProviderRuntimeConfiguration,
)
from openai.types.model import Model


class LocalOpenAISDKModelParams(BaseLLMParams):
    pass


class LocalOpenAISDKProvider(LLMProvider):
    def __init__(self, runtime_config: ProviderRuntimeConfiguration):
        super().__init__(runtime_config)

    provider_title = "Local (OpenAI SDK)"
    provider_name = "local-openai-sdk"
    provider_base_url = None
    provider_description = "Use any locally-ran LLM that is compatible with the OpenAI SDK, e.g. Llama.cpp or LM Studio. Make sure that the model you are planning to use supports structured responses."
    provider_model_parameters = LocalOpenAISDKModelParams
    api_key_config_parameter = None
    provider_config_parameters = []

    @property
    def config(self) -> ProviderRuntimeConfiguration:
        return self._config

    async def generate_answer_async(
        self, configuration: BaseLLMParams, schema: Type[T], prompt: str
    ) -> tuple[T, str]:
        from openai import AsyncOpenAI
        import openai

        if self.config.model is None:
            raise RuntimeError("Model needs to be defined")

        async with AsyncOpenAI(
            # TODO: Fix
            api_key="",
            base_url="http://localhost:1234/v1",
        ) as client:
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
                    top_p=configuration.top_p,
                    temperature=configuration.temperature,
                    # Structured Outputs is available in OpenAI's latest large language models, starting with GPT-4o
                    text_format=schema,
                )
                if response.output_parsed is None:
                    raise RuntimeError("Output from LLM was empty")
                return response.output_parsed, ""
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

            raise RuntimeError("LLM call failed")

    async def get_available_models(self) -> List[Model]:
        from openai import AsyncOpenAI

        async with AsyncOpenAI(
            # TODO: Fix
            api_key=self.config.api_key,
            base_url="http://localhost:1234/v1",
        ) as client:
            models = await client.models.list()
            return models.data
