from typing import List

from pydantic import ValidationError
from src.core.llm.providers.provider import (
    T,
    BaseLLMParams,
    ConfigParameter,
    LLMProvider,
)

from src.schemas.llm import (
    ProviderRuntimeConfiguration,
)
from openai.types.model import Model


class OpenRouterModelParams(BaseLLMParams):
    pass


class OpenRouterProvider(LLMProvider):
    def __init__(self, runtime_config: ProviderRuntimeConfiguration):
        super().__init__(runtime_config)

    provider_title = "OpenRouter (Cloud)"
    provider_name = "openrouter"
    provider_base_url = "https://openrouter.ai/api/v1"
    provider_description = "OpenRouter provides one API for any model. Access all major models through a single, unified interface. OpenAI SDK works out of the box."
    provider_model_parameters = OpenRouterModelParams
    api_key_config_parameter = ConfigParameter(
        key="openrouter_api_key", title="OpenRouter API key"
    )
    provider_config_parameters = [api_key_config_parameter]

    @property
    def set_model_parameters(self, params: OpenRouterModelParams):
        self.model_parameters = params

    @property
    def config(self) -> ProviderRuntimeConfiguration:
        return self._config

    async def generate_answer_async(
        self, configuration: BaseLLMParams, schema: type[T], prompt
    ) -> tuple[T, str]:
        import aiohttp
        from openai.lib._pydantic import to_strict_json_schema
        import json
        import logging

        logger = logging.getLogger(__name__)

        if self.config.api_key is None:
            raise RuntimeError("API Key is not defined")

        content = None
        data = None
        async with aiohttp.ClientSession() as session:
            data = {
                "model": self.config.model,
                "messages": [
                    (
                        {
                            "role": "system",
                            # "content": system_prompt + "\r\n" + json_instruct_prompt, <-- Test if JSON responses work without this
                            "content": self.config.system_prompt,
                        }
                    ),
                    {"role": "user", "content": prompt},
                ],
                "provider": {"require_parameters": True, "data_collection": "deny"},
                "max_tokens": 8193,
                "response_format": {
                    "type": "json_schema",
                    "json_schema": {
                        "name": "structured_response",
                        "strict": True,
                        "schema": to_strict_json_schema(schema),
                    },
                },
                "temperature": configuration.temperature,
                "seed": configuration.seed,
                "top_p": configuration.top_p,
            }

            async with session.post(
                f"{self.config.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.config.api_key}",
                    "Content-type": "application/json",
                },
                json=data,
            ) as response:
                logger.info("Status: %s", response.status)
                logger.info("Content-type: %s", response.headers["content-type"])

                if response.status != 200:
                    text = await response.text()
                    logger.error(
                        "LLM request failed with response status %s", response.status
                    )
                    logger.error("Response: %s", text)
                    raise RuntimeError(text)

                completion = await response.json()
                data = json.dumps(completion)

                # For type-safety, validate the response JSON
                # Things might have gotten better in OpenRouter's infrastructure, so JSON is properly outputted from the OpenRouter interface.
                import re

                json_match = re.search(
                    r"json\s*(\{.*\})",
                    completion["choices"][0]["message"]["content"],
                    re.DOTALL,
                )
                json_str = (
                    # First, check if the response starts with "json"
                    json_match.group(1).strip()
                    if json_match
                    # Assume that the content is valid JSON
                    else completion["choices"][0]["message"]["content"].strip()
                )
                try:
                    content = schema.model_validate_json(json_str)
                except ValidationError as e:
                    logger.error(e)
                    raise e
        return content, data

    async def get_available_models(self) -> List[Model]:
        import aiohttp

        required_parameters = [
            "structured_outputs",
            "response_format",
            "temperature",
            "top_p",
            "seed",
        ]
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{self.provider_base_url}/models?supported_parameters={','.join(required_parameters)}",
                headers={
                    "Authorization": f"Bearer {self.config.api_key}",
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
