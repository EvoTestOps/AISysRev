from typing import Any, List, Type

from pydantic import BaseModel, ValidationError
from src.core.llm.providers.provider import (
    T,
    BaseLLMParams,
    ConfigParameter,
    LLMProvider,
)

from src.schemas.llm import (
    ProviderRuntimeParameters,
)
from openai.types.model import Model


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
        model_parameters: dict[str, Any],
        schema: Type[T],
        prompt: str,
    ) -> tuple[T, str]:
        cfg = self.parse_model_parameters(model_parameters)

        import aiohttp
        from openai.lib._pydantic import to_strict_json_schema
        import json
        import logging

        logger = logging.getLogger(__name__)

        if self.runtime_parameters.api_key is None:
            raise RuntimeError("API Key is not defined")

        if self.provider_parameters is None:
            raise RuntimeError("Provider parameters needs to be defined")

        content = None
        data = None
        async with aiohttp.ClientSession() as session:
            data = {
                "model": self.runtime_parameters.model,
                "messages": [
                    {
                        "role": "system",
                        # "content": system_prompt + "\r\n" + json_instruct_prompt, <-- Test if JSON responses work without this
                        "content": self.runtime_parameters.system_prompt,
                    },
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
                "temperature": cfg.temperature,
                "top_p": cfg.top_p,
            }

            async with session.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.runtime_parameters.api_key}",
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
