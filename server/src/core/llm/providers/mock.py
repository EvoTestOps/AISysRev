import asyncio
import random
from typing import Any, List

from httpx import AsyncClient
from openai.types.model import Model
from pydantic import BaseModel, Field

from src.core.llm.providers.provider import BaseLLMParams, LLMProvider, T
from src.schemas.llm import (
    Criterion,
    CriterionResponse,
    Decision,
    LikertDecision,
    ProviderRuntimeParameters,
    StructuredResponse,
)


class MockProviderParams(BaseModel):
    delay: int = Field(
        title="Request duration (ms)",
        description="Duration of the request in milliseconds.",
        default=1000,
    )
    delay_jitter: int = Field(
        title="Request jitter (ms)",
        description="Jitter of the request duration, randomly sampled for each LLM request (duration +- jitter)",
        default=500,
    )


class MockModelParams(BaseLLMParams):
    pass


class MockProvider(LLMProvider[MockProviderParams, MockModelParams]):
    def __init__(
        self, provider_params: dict[str, Any], runtime_config: ProviderRuntimeParameters
    ):
        super().__init__(provider_params, runtime_config)

    provider_title = "Mock (Local)"
    provider_name = "mock"
    provider_description = (
        "Mock provider to test the flow: Client <-> Server <-> Celery."
    )

    provider_parameters_schema = MockProviderParams
    model_parameters_schema = MockModelParams
    api_key_config_parameter = None
    config_parameters = []

    async def generate_answer_async(
        self,
        client: AsyncClient,
        model_parameters: dict[str, Any],
        schema: type[T],
        prompt,
    ) -> T:
        if self.provider_parameters is None:
            raise RuntimeError("Provider parameters needs to be defined")

        jitter_ms = random.uniform(
            -self.provider_parameters.delay_jitter,
            self.provider_parameters.delay_jitter,
        )
        delay_ms = max(0.0, self.provider_parameters.delay + jitter_ms)
        await asyncio.sleep(delay_ms / 1000.0)

        if schema is CriterionResponse:
            return CriterionResponse(
                probability_decision=1.0,
                reason="The criterion is met.",
            )

        return StructuredResponse(
            overall_decision=Decision(
                binary_decision=True,
                probability_decision=1.0,
                likert_decision=LikertDecision.stronglyAgree,
                reason="The paper completely meets the inclusion criteria.",
            ),
            inclusion_criteria=[
                Criterion(
                    name="Example criteria",
                    decision=Decision(
                        binary_decision=True,
                        probability_decision=1.0,
                        likert_decision=LikertDecision.stronglyAgree,
                        reason="The criteria is met.",
                    ),
                )
            ],
            exclusion_criteria=[
                Criterion(
                    name="Example criteria",
                    decision=Decision(
                        binary_decision=False,
                        probability_decision=0.0,
                        likert_decision=LikertDecision.stronglyDisagree,
                        reason="The criteria is not met.",
                    ),
                )
            ],
        )

    async def get_available_models(self) -> List[Model]:
        return [Model(id="mock_001", created=0, object="model", owned_by="mock")]

    async def embed_async(
        self,
        client: AsyncClient,
        texts: list[str],
    ) -> list[list[float]]:
        if self.provider_parameters is None:
            raise RuntimeError("Provider parameters needs to be defined")

        jitter_ms = random.uniform(
            -self.provider_parameters.delay_jitter,
            self.provider_parameters.delay_jitter,
        )
        delay_ms = max(0.0, self.provider_parameters.delay + jitter_ms)
        await asyncio.sleep(delay_ms / 1000.0)

        return [[0.1] * 1536 for _ in texts]
