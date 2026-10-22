import re
from typing import Any, List, Type

from httpx2 import AsyncClient
from openai.types.model import Model
from pydantic import BaseModel, Field, create_model
from pydantic_ai import Agent
from pydantic_ai.models.typesafe import TypeSafeModel, TypeSafeModelSettings
from pydantic_ai.providers.typesafe import TypeSafeProvider
from typesafe_sdk import AsyncTypeSafeClient, RetryPolicy

from src.core.llm.providers.openrouter import (
    OPENROUTER_HEADERS,
    OpenRouterProvider,
    OpenRouterProviderParams,
)
from src.core.llm.providers.provider import ConfigParameter, LLMProvider, T
from src.schemas.llm import (
    CriterionResponse,
    JevCriterion,
    JevDecision,
    JevStructuredResponse,
    ProviderRuntimeParameters,
)

# OpenRouter's System One API, compatible with the TypeSafe SDK, which appends
# /v1/systemone. https://openrouter.ai/docs/guides/community/typesafe-sdk
OPENROUTER_SYSTEMONE_BASE_URL = "https://openrouter.ai/api"

DEFAULT_JEV_MODEL = "jev-latest"
# OpenRouter's /models does not list System One models, so they are listed here.
# The pinned version keeps runs reproducible; jev-latest moves with releases.
JEV_MODELS = [DEFAULT_JEV_MODEL, "typesafe/jev-1.13"]

REQUEST_TIMEOUT_SECONDS = 60.0

# Criteria lines rendered by create_criteria(), e.g. "- IC1: <criterion>".
_CRITERIA_RE = re.compile(
    r"^- ((?:IC|EC)\d+): (.*?)(?=\n- (?:IC|EC)\d+: |\n\n|\Z)", re.M | re.S
)
# The criterion line of the per-criteria prompts, e.g. "Criterion: <criterion>".
_CRITERION_RE = re.compile(r"^Criterion: (.*?)(?=\n\n|\Z)", re.M | re.S)

_GOAL = (
    "Screen the paper or repository described in the text for a systematic "
    "review, judging only from the text given: its title and abstract or "
    "excerpts of its full text (or, for a repository, its README)."
)


def _probability_field(description: str) -> Any:
    return Field(ge=0, le=1, description=description)


def _parse_criteria(prompt: str) -> dict[str, str]:
    criteria: dict[str, str] = {}
    for criterion_id, text in _CRITERIA_RE.findall(prompt):
        criteria.setdefault(criterion_id, text.strip())
    return criteria


def _screening_answers_model(criteria: dict[str, str]) -> type[BaseModel]:
    fields: dict[str, Any] = {
        "overall": (
            float,
            _probability_field(
                "Should the paper or repository be included in the review? It "
                "is included only if it meets all inclusion criteria, and "
                "excluded if it meets any exclusion criterion."
            ),
        )
    }
    for criterion_id, text in criteria.items():
        kind = "inclusion" if criterion_id.startswith("IC") else "exclusion"
        fields[criterion_id] = (
            float,
            _probability_field(
                f"Does the paper or repository meet this {kind} criterion? {text}"
            ),
        )
    return create_model("ScreeningAnswers", __doc__=_GOAL, **fields)


def _criterion_answer_model(criterion: str) -> type[BaseModel]:
    return create_model(
        "CriterionAnswer",
        __doc__=_GOAL,
        applies=(
            float,
            _probability_field(
                f"Does the paper or repository meet this criterion? {criterion}"
            ),
        ),
    )


def _reason(probability: float) -> str:
    return (
        f"TypeSafe Jev probability {probability:.3f}; "
        "Jev does not provide written reasoning."
    )


def _decision(probability: float) -> JevDecision:
    return JevDecision(
        binary_decision=probability >= 0.5,
        probability_decision=probability,
        reason=_reason(probability),
    )


class JevModelParams(BaseModel):
    pass


class JevProvider(LLMProvider[OpenRouterProviderParams, JevModelParams]):
    def __init__(
        self,
        provider_parameters: dict[str, Any],
        runtime_config: ProviderRuntimeParameters,
    ):
        super().__init__(provider_parameters, runtime_config)

    provider_title = "TypeSafe Jev (OpenRouter)"
    provider_name = "jev"
    provider_description = (
        "TypeSafe Jev, a decision model called through OpenRouter. Returns "
        "calibrated probabilities only: no written reasoning, no Likert scale "
        "and no few-shot prompting. Uses your OpenRouter API key and ZDR "
        "settings."
    )
    provider_parameters_schema = OpenRouterProviderParams
    model_parameters_schema = JevModelParams
    structured_response_schema = JevStructuredResponse
    # Jev would judge the examples as part of the text.
    supports_few_shot = False
    # Jev would judge a system prompt as part of the text.
    uses_system_prompt = False

    # Shares OpenRouter's settings, which the Settings page shows under OpenRouter.
    api_key_config_parameter = OpenRouterProvider.api_key_config_parameter
    config_parameters = []

    @classmethod
    def global_config_parameters(cls) -> list[ConfigParameter]:
        return [OpenRouterProvider.force_zdr_config_parameter]

    @classmethod
    def apply_global_config_overrides(
        cls, provider_parameters: dict[str, Any], global_config: dict[str, str]
    ) -> dict[str, Any]:
        return OpenRouterProvider.apply_global_config_overrides(
            provider_parameters, global_config
        )

    def _build_model(self, client: AsyncClient) -> TypeSafeModel:
        if self.runtime_parameters.api_key is None:
            raise RuntimeError("API Key is not defined")
        if self.provider_parameters is None:
            raise RuntimeError("Provider parameters needs to be defined")

        openrouter_provider: dict[str, Any] = {"data_collection": "deny"}
        if self.provider_parameters.zdr:
            openrouter_provider["zdr"] = True

        typesafe_client = AsyncTypeSafeClient(
            api_key=self.runtime_parameters.api_key,
            base_url=OPENROUTER_SYSTEMONE_BASE_URL,
            http_client=client,
            # The shared client's transport already retries.
            retry=RetryPolicy(max_retries=0),
        )
        return TypeSafeModel(
            self.runtime_parameters.model or DEFAULT_JEV_MODEL,
            provider=TypeSafeProvider(typesafe_client=typesafe_client),
            settings=TypeSafeModelSettings(
                timeout=REQUEST_TIMEOUT_SECONDS,
                extra_headers=OPENROUTER_HEADERS,
                extra_body={"provider": openrouter_provider},
            ),
        )

    async def _answer(
        self, client: AsyncClient, answer_model: type[BaseModel], prompt: str
    ) -> dict[str, Any]:
        # No system prompt: Jev would judge it as part of the text.
        agent = Agent(
            self._build_model(client),
            retries={"tools": 3, "output": 5},
            output_type=answer_model,
        )
        result = await agent.run(prompt)
        return result.output.model_dump()

    async def generate_answer_async(
        self,
        client: AsyncClient,
        model_parameters: dict[str, Any],
        schema: Type[T],
        prompt: str,
    ) -> T:
        if schema is CriterionResponse:
            match = _CRITERION_RE.search(prompt)
            if match is None:
                raise ValueError("No criterion found in the per-criteria prompt")
            answers = await self._answer(
                client, _criterion_answer_model(match.group(1).strip()), prompt
            )
            return schema.model_validate(
                CriterionResponse(
                    probability_decision=answers["applies"],
                    reason=_reason(answers["applies"]),
                ).model_dump()
            )
        if schema is not JevStructuredResponse:
            raise ValueError(f"Jev does not support the {schema.__name__} schema")
        criteria = _parse_criteria(prompt)
        answers = await self._answer(client, _screening_answers_model(criteria), prompt)

        return schema.model_validate(
            JevStructuredResponse(
                overall_decision=_decision(answers["overall"]),
                inclusion_criteria=[
                    JevCriterion(name=cid, decision=_decision(answers[cid]))
                    for cid in criteria
                    if cid.startswith("IC")
                ],
                exclusion_criteria=[
                    JevCriterion(name=cid, decision=_decision(answers[cid]))
                    for cid in criteria
                    if cid.startswith("EC")
                ],
            ).model_dump()
        )

    async def embed_async(
        self,
        client: AsyncClient,
        texts: list[str],
    ) -> list[list[float]]:
        # Full-text screening picks PDF excerpts by embedding similarity. Jev
        # has no embeddings, so OpenRouter's are used with the same key and
        # model, which keeps the cached criteria and chunk embeddings shared.
        if self.provider_parameters is None:
            raise RuntimeError("Provider parameters needs to be defined")
        return await OpenRouterProvider(
            self.provider_parameters.model_dump(), self.runtime_parameters
        ).embed_async(client, texts)

    async def get_available_models(self) -> List[Model]:
        return [
            Model(id=model_id, created=0, object="model", owned_by="typesafe")
            for model_id in JEV_MODELS
        ]
