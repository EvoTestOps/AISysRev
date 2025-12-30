from typing import Any, List, Type, TypeVar
from openai.types.model import Model
from pydantic import BaseModel, ValidationError
from src.schemas.llm import (
    Criterion,
    Decision,
    LLMConfiguration,
    LikertDecision,
    StructuredResponse,
)

from abc import ABC, abstractmethod

T = TypeVar("T", bound=BaseModel)


class LLM(ABC):
    from openai.types.model import Model

    @abstractmethod
    def __init__(self, config: LLMConfiguration):
        pass

    @abstractmethod
    async def get_available_models(self) -> List[Model]:
        pass

    @abstractmethod
    async def generate_answer_async(
        self, schema: Type[T], prompt: str
    ) -> tuple[T, str]:
        pass

    @property
    @abstractmethod
    def config(self) -> LLMConfiguration:
        pass


class MockLLM(LLM):
    def __init__(self, config):
        self._config = config

    async def get_available_models(self) -> List[Model]:
        return list()

    async def generate_answer_async(self, schema: type[T], prompt) -> tuple[T, str]:
        import json

        return (
            StructuredResponse(
                overall_decision=Decision(
                    binary_decision=False,
                    probability_decision=0.0,
                    likert_decision=LikertDecision.stronglyDisagree,
                    reason="Excluded",
                ),
                inclusion_criteria=[
                    Criterion(
                        name="Foo",
                        decision=Decision(
                            binary_decision=False,
                            probability_decision=0.0,
                            likert_decision=LikertDecision.stronglyDisagree,
                            reason="Does not match",
                        ),
                    )
                ],
                exclusion_criteria=[
                    Criterion(
                        name="Bar",
                        decision=Decision(
                            binary_decision=True,
                            probability_decision=0.8,
                            likert_decision=LikertDecision.stronglyAgree,
                            reason="Matches",
                        ),
                    )
                ],
            ),  # type: ignore
            json.dumps({"Foo": "Bar"}),
        )

    @property
    def config(self):
        raise NotImplementedError


class OpenRouterLLM(LLM):
    def __init__(self, config: LLMConfiguration):
        self._config = config

    async def get_available_models(self) -> Any:
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
                f"{self.config.base_url}/models?supported_parameters={','.join(required_parameters)}",
                headers={
                    "Authorization": f"Bearer {self.config.api_key}",
                    "Content-type": "application/json",
                },
            ) as response:
                body = await response.json()
                return body

    async def generate_answer_async(self, schema: type[T], prompt) -> tuple[T, str]:
        import aiohttp
        from openai.lib._pydantic import to_strict_json_schema
        import json
        import logging

        logger = logging.getLogger(__name__)

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
                "temperature": self.config.temperature,
                "seed": self.config.seed,
                "top_p": self.config.top_p,
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

    @property
    def config(self) -> LLMConfiguration:
        return self._config


class OpenAiSDKLLM(LLM):
    from openai.types.model import Model

    def __init__(self, config: LLMConfiguration):
        self._config = config

    async def get_available_models(self) -> List[Model]:
        from openai import AsyncOpenAI

        async with AsyncOpenAI(
            api_key=self.config.api_key, base_url=self.config.base_url
        ) as client:
            models = await client.models.list()
            return models.data

    async def generate_answer_async(self, schema: type[T], prompt) -> tuple[T, str]:
        from openai import AsyncOpenAI
        import openai

        async with AsyncOpenAI(
            api_key=self.config.api_key, base_url=self.config.base_url
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
                    seed=self.config.seed,
                    top_p=self.config.top_p,
                    temperature=self.config.temperature,
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

    @property
    def config(self) -> LLMConfiguration:
        return self._config
