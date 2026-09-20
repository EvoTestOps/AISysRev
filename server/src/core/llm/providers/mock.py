import asyncio
import random
import re
from dataclasses import dataclass
from typing import Any, List

from httpx2 import AsyncClient
from openai.types.model import Model
from pydantic import BaseModel, Field
from pydantic_ai import Agent
from pydantic_ai.messages import (
    ModelMessage,
    ModelRequest,
    ModelResponse,
    ToolCallPart,
    UserPromptPart,
)
from pydantic_ai.models.function import AgentInfo, FunctionModel
from pydantic_ai.output import ToolOutput

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


CHARS_PER_TOKEN = 4
EMBEDDING_DIM = 1536


@dataclass(frozen=True)
class MockModelProfile:
    """Simulated memory characteristics of a mock model.

    criteria_reason_tokens is the *average* number of tokens of free-text
    reasoning a single criterion decision gets (used identically for both
    inclusion and exclusion criteria, and for the single-criterion
    CriterionResponse used in PER_CRITERIA mode) — mirrors how verbose a
    real model's reasoning tends to be, so response payload sizes scale
    similarly to a real provider's. The actual size sampled per call varies
    around this average (see _make_reason).
    """

    criteria_reason_tokens: int


MOCK_MODEL_PROFILES: dict[str, MockModelProfile] = {
    "mock-small": MockModelProfile(criteria_reason_tokens=500),
    "mock-medium": MockModelProfile(criteria_reason_tokens=2000),
    "mock-large": MockModelProfile(criteria_reason_tokens=8000),
}
DEFAULT_MOCK_MODEL = "mock-medium"

_CRITERIA_ID_RE = re.compile(r"-\s*(IC|EC)\d+:")
_REASON_TOKENS_JITTER = 0.3


def generate_reason(base: str, average_tokens: int) -> str:
    sampled_tokens = max(
        1,
        round(
            random.uniform(
                average_tokens * (1 - _REASON_TOKENS_JITTER),
                average_tokens * (1 + _REASON_TOKENS_JITTER),
            )
        ),
    )
    target_chars = sampled_tokens * CHARS_PER_TOKEN
    if len(base) >= target_chars:
        return base
    filler = (
        " Additional simulated reasoning detail to approximate a "
        "larger model's response size."
    )
    reason = base
    while len(reason) < target_chars:
        reason += filler
    return reason[:target_chars]


def _last_user_prompt(messages: list[ModelMessage]) -> str:
    for message in reversed(messages):
        if isinstance(message, ModelRequest):
            for part in message.parts:
                if isinstance(part, UserPromptPart) and isinstance(part.content, str):
                    return part.content
    return ""


def _build_criterion_response(profile: MockModelProfile) -> CriterionResponse:
    return CriterionResponse(
        probability_decision=1.0,
        reason=generate_reason("The criterion is met.", profile.criteria_reason_tokens),
    )


def _build_structured_response(
    profile: MockModelProfile, prompt: str
) -> StructuredResponse:
    # Real models answer with one decision per criterion actually asked
    # about in the prompt (see create_criteria()), not a fixed count.
    criteria_ids = _CRITERIA_ID_RE.findall(prompt)
    inclusion_count = max(1, criteria_ids.count("IC"))
    exclusion_count = max(1, criteria_ids.count("EC"))

    return StructuredResponse(
        overall_decision=Decision(
            binary_decision=True,
            probability_decision=1.0,
            likert_decision=LikertDecision.stronglyAgree,
            reason=generate_reason(
                "The paper completely meets the inclusion criteria.",
                profile.criteria_reason_tokens,
            ),
        ),
        inclusion_criteria=[
            Criterion(
                name=f"IC{i + 1}",
                decision=Decision(
                    binary_decision=True,
                    probability_decision=1.0,
                    likert_decision=LikertDecision.stronglyAgree,
                    reason=generate_reason(
                        "The criteria is met.", profile.criteria_reason_tokens
                    ),
                ),
            )
            for i in range(inclusion_count)
        ],
        exclusion_criteria=[
            Criterion(
                name=f"EC{i + 1}",
                decision=Decision(
                    binary_decision=False,
                    probability_decision=0.0,
                    likert_decision=LikertDecision.stronglyDisagree,
                    reason=generate_reason(
                        "The criteria is not met.", profile.criteria_reason_tokens
                    ),
                ),
            )
            for i in range(exclusion_count)
        ],
    )


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

    def _profile(self) -> MockModelProfile:
        model = self.runtime_parameters.model
        if model is None:
            return MOCK_MODEL_PROFILES[DEFAULT_MOCK_MODEL]
        profile = MOCK_MODEL_PROFILES.get(model)
        if profile is None:
            raise ValueError(
                f"Unknown mock model {model!r}, expected one of "
                f"{list(MOCK_MODEL_PROFILES)}"
            )
        return profile

    async def _simulate_latency(self) -> None:
        if self.provider_parameters is None:
            raise RuntimeError("Provider parameters needs to be defined")

        jitter_ms = random.uniform(
            -self.provider_parameters.delay_jitter,
            self.provider_parameters.delay_jitter,
        )
        delay_ms = max(0.0, self.provider_parameters.delay + jitter_ms)
        await asyncio.sleep(delay_ms / 1000.0)

    async def _mock_model_fn(
        self, messages: list[ModelMessage], info: AgentInfo
    ) -> ModelResponse:
        """Stand-in for the LLM: answers the Agent's output tool call.

        The payload is returned as raw tool-call args, so pydantic-ai validates
        it against the requested schema just like a real provider's response.
        """
        await self._simulate_latency()

        profile = self._profile()
        tool_name = info.output_tools[0].name
        payload: BaseModel
        if tool_name == CriterionResponse.__name__.lower():
            payload = _build_criterion_response(profile)
        else:
            payload = _build_structured_response(profile, _last_user_prompt(messages))

        return ModelResponse(
            parts=[
                ToolCallPart(tool_name=tool_name, args=payload.model_dump(mode="json"))
            ]
        )

    async def generate_answer_async(
        self,
        client: AsyncClient,
        model_parameters: dict[str, Any],
        schema: type[T],
        prompt: str,
    ) -> T:
        if self.provider_parameters is None:
            raise RuntimeError("Provider parameters needs to be defined")

        # Fail early on an unknown model, before the Agent runs.
        self._profile()

        model = FunctionModel(
            self._mock_model_fn,
            model_name=str(self.runtime_parameters.model or DEFAULT_MOCK_MODEL),
        )

        agent = Agent(
            model,
            system_prompt=self.runtime_parameters.system_prompt,
            retries={"tools": 3, "output": 5},
            output_type=ToolOutput(schema, name=schema.__name__.lower()),
        )

        result = await agent.run(prompt)
        return result.output

    async def get_available_models(self) -> List[Model]:
        return [
            Model(id=model_id, created=0, object="model", owned_by="mock")
            for model_id in MOCK_MODEL_PROFILES
        ]

    async def embed_async(
        self,
        client: AsyncClient,
        texts: list[str],
    ) -> list[list[float]]:
        await self._simulate_latency()

        return [[random.uniform(-1, 1) for _ in range(EMBEDDING_DIM)] for _ in texts]
