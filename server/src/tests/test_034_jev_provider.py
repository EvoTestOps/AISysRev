import json
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import httpx2
import pytest
from pydantic_ai.exceptions import ModelHTTPError

from src.core.llm.providers.jev import JEV_MODELS, JevProvider
from src.core.prompts import additional_instructions, zero_shot_task_prompt
from src.schemas.job import (
    JobCreate,
    JobScreeningMode,
    LLMModelConfig,
    PerCriteriaPromptingConfig,
    ZeroShotPromptingConfig,
)
from src.schemas.jobtask import JobTaskRead
from src.schemas.llm import (
    CriterionResponse,
    JevStructuredResponse,
    ProviderRuntimeParameters,
    StructuredResponse,
)
from src.schemas.setting import SettingRead
from src.services.job_service import JobService
from src.services.llm_service import LLMService
from src.services.result_service import create_dataframe
from src.tools.llm_decision_creator import create_criteria

pytestmark = pytest.mark.unit

API_KEY = "sk-or-test"
ZERO_SHOT_PROMPT = zero_shot_task_prompt.format(
    "The title",
    "The abstract",
    create_criteria(["Is empirical", "Is about testing"], ["Is a survey"]),
    additional_instructions,
    "Abstract",
)


class _JevServer:
    """Stands in for OpenRouter's System One API and records the requests."""

    def __init__(self, probabilities: dict[str, float] | None = None, status=200):
        self.probabilities = probabilities or {}
        self.status = status
        self.requests: list[httpx2.Request] = []

    def __call__(self, request: httpx2.Request) -> httpx2.Response:
        self.requests.append(request)
        if self.status != 200:
            return httpx2.Response(
                self.status, json={"error": {"message": "No auth", "code": 401}}
            )
        questions = json.loads(request.content)["questions"]
        answers = {
            name: {"type": "noul", "noul": self.probabilities.get(name, 0.5)}
            for name in questions
        }
        return httpx2.Response(
            200,
            json={
                "id": "gen-dec-1",
                "model": "typesafe/jev-1.13-20260917",
                "provider": "TypeSafe",
                "answers": answers,
                "usage": {"input_tokens": 100, "output_tokens": 10, "cost": 0.0},
            },
        )

    def body(self, index: int = -1) -> dict:
        return json.loads(self.requests[index].content)


def _provider(
    zdr: bool = False, api_key: str | None = API_KEY, model: str | None = "jev-latest"
) -> JevProvider:
    return JevProvider(
        {"zdr": zdr}, ProviderRuntimeParameters(model=model, api_key=api_key)
    )


async def _run(provider: JevProvider, server: _JevServer, schema, prompt: str):
    client = httpx2.AsyncClient(transport=httpx2.MockTransport(server))
    return await provider.generate_answer_async(
        client=client, model_parameters={}, schema=schema, prompt=prompt
    )


# --- Request ----------------------------------------------------------------


@pytest.mark.asyncio
async def test_calls_openrouters_system_one_api_with_the_openrouter_key():
    server = _JevServer()

    await _run(_provider(), server, JevStructuredResponse, ZERO_SHOT_PROMPT)

    assert len(server.requests) == 1
    request = server.requests[0]
    assert request.method == "POST"
    assert str(request.url) == "https://openrouter.ai/api/v1/systemone"
    assert request.headers["authorization"] == f"Bearer {API_KEY}"
    assert request.headers["x-title"] == "AISysRev"
    assert request.headers["http-referer"] == "https://github.com/EvoTestOps/AISysRev"
    body = server.body()
    assert body["model"] == "jev-latest"
    assert body["state"] == ZERO_SHOT_PROMPT


@pytest.mark.asyncio
async def test_defaults_to_jev_latest_without_a_model():
    server = _JevServer()

    await _run(_provider(model=None), server, JevStructuredResponse, ZERO_SHOT_PROMPT)

    assert server.body()["model"] == "jev-latest"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("zdr", "expected"),
    [
        (False, {"data_collection": "deny"}),
        (True, {"data_collection": "deny", "zdr": True}),
    ],
)
async def test_sends_openrouter_provider_preferences(zdr, expected):
    server = _JevServer()

    await _run(_provider(zdr=zdr), server, JevStructuredResponse, ZERO_SHOT_PROMPT)

    assert server.body()["provider"] == expected


# --- PER_CRITERIA is not supported -----------------------------------------


@pytest.mark.asyncio
@pytest.mark.parametrize("schema", [CriterionResponse, StructuredResponse])
async def test_other_schemas_are_refused_before_any_request(schema):
    server = _JevServer()

    with pytest.raises(ValueError, match=schema.__name__):
        await _run(_provider(), server, schema, ZERO_SHOT_PROMPT)

    assert server.requests == []


def test_per_criteria_is_not_offered():
    assert JevProvider.supports_per_criteria is False


def _job(provider_name: str, prompting_config) -> JobCreate:
    return JobCreate(
        project_uuid=uuid4(),
        owner_uuid=uuid4(),
        llm_config=LLMModelConfig(
            provider_name=provider_name,
            model_name="jev-latest",
            provider_parameters={"zdr": False},
            model_parameters={},
        ),
        prompting_config=prompting_config,
        screening_mode=JobScreeningMode.TEXT,
    )


@pytest.mark.asyncio
async def test_a_per_criteria_jev_job_is_rejected_before_it_is_created():
    job_crud = MagicMock()
    job_crud.create_job = AsyncMock()
    service = JobService(MagicMock(), job_crud)

    with pytest.raises(ValueError, match="PER_CRITERIA"):
        await service.create(_job("jev", PerCriteriaPromptingConfig()))

    job_crud.create_job.assert_not_awaited()


@pytest.mark.asyncio
async def test_a_zero_shot_jev_job_is_created():
    job_crud = MagicMock()
    job_crud.create_job = AsyncMock(side_effect=RuntimeError("created"))
    service = JobService(MagicMock(), job_crud)

    # Passing the guard reaches the CRUD call.
    with pytest.raises(RuntimeError, match="created"):
        await service.create(_job("jev", ZeroShotPromptingConfig()))


# --- Zero-shot / few-shot ---------------------------------------------------


@pytest.mark.asyncio
async def test_structured_asks_one_noul_per_criterion_in_one_request():
    server = _JevServer({"overall": 0.2, "IC1": 0.9, "IC2": 0.4, "EC1": 0.7})

    result = await _run(_provider(), server, JevStructuredResponse, ZERO_SHOT_PROMPT)

    assert len(server.requests) == 1
    questions = server.body()["questions"]
    assert list(questions) == ["overall", "IC1", "IC2", "EC1"]
    assert all(q["type"] == "noul" for q in questions.values())
    assert "Is about testing" in json.dumps(questions["IC2"]["instructions"])
    assert "exclusion criterion" in json.dumps(questions["EC1"]["instructions"])

    assert isinstance(result, JevStructuredResponse)
    assert result.overall_decision.probability_decision == 0.2
    assert result.overall_decision.binary_decision is False
    assert [
        (c.name, c.decision.probability_decision) for c in result.inclusion_criteria
    ] == [
        ("IC1", 0.9),
        ("IC2", 0.4),
    ]
    assert [c.decision.binary_decision for c in result.inclusion_criteria] == [
        True,
        False,
    ]
    assert [
        (c.name, c.decision.binary_decision) for c in result.exclusion_criteria
    ] == [("EC1", True)]


@pytest.mark.asyncio
async def test_structured_result_has_no_likert_and_reads_back_as_jev():
    server = _JevServer({"overall": 0.8, "IC1": 0.9, "IC2": 0.6, "EC1": 0.1})
    result = await _run(_provider(), server, JevStructuredResponse, ZERO_SHOT_PROMPT)

    dumped = result.model_dump(mode="json")
    assert "likert_decision" not in json.dumps(dumped)

    task = _job_task_read(dumped)
    assert isinstance(task.result, JevStructuredResponse)


def test_a_regular_result_still_reads_back_as_structured_response():
    decision = {
        "binary_decision": True,
        "probability_decision": 0.9,
        "likert_decision": "6",
        "reason": "Fits.",
    }
    task = _job_task_read(
        {
            "overall_decision": decision,
            "inclusion_criteria": [{"name": "IC1", "decision": decision}],
            "exclusion_criteria": [],
        }
    )

    assert isinstance(task.result, StructuredResponse)


def _job_task_read(result: dict) -> JobTaskRead:
    return JobTaskRead.model_validate(
        {
            "uuid": uuid4(),
            "job_id": 1,
            "doi": None,
            "title": "The title",
            "abstract": "The abstract",
            "paper_uuid": uuid4(),
            "status": "DONE",
            "result": result,
        }
    )


# --- Errors -----------------------------------------------------------------


@pytest.mark.asyncio
async def test_missing_api_key_fails_before_any_request():
    server = _JevServer()

    with pytest.raises(RuntimeError, match="API Key"):
        await _run(
            _provider(api_key=None), server, JevStructuredResponse, ZERO_SHOT_PROMPT
        )

    assert server.requests == []


@pytest.mark.asyncio
async def test_http_errors_surface_as_model_http_errors():
    server = _JevServer(status=401)

    with pytest.raises(ModelHTTPError) as exc_info:
        await _run(_provider(), server, JevStructuredResponse, ZERO_SHOT_PROMPT)

    assert exc_info.value.status_code == 401


# --- Settings and models ----------------------------------------------------


def test_shares_openrouters_settings():
    assert JevProvider.api_key_config_parameter is not None
    assert JevProvider.api_key_config_parameter.key == "openrouter_api_key"
    # Nothing of its own for the Settings page to show.
    assert JevProvider.config_parameters == []
    assert JevProvider.structured_response_schema is JevStructuredResponse


@pytest.mark.asyncio
async def test_force_zdr_setting_applies_to_jev():
    setting_service = MagicMock()

    async def fake_get_setting(key, owner_uuid, mask_secret=False):
        if key == "openrouter_force_zdr":
            return SettingRead(name=key, value="true", secret=False)
        return None

    setting_service.get_setting = AsyncMock(side_effect=fake_get_setting)

    result = await LLMService(setting_service).resolve_provider_parameters(
        JevProvider, {"zdr": False}, uuid4()
    )

    assert result == {"zdr": True}
    called_keys = [call.args[0] for call in setting_service.get_setting.await_args_list]
    assert called_keys == ["openrouter_force_zdr"]


@pytest.mark.asyncio
async def test_lists_the_jev_models():
    models = await _provider().get_available_models()

    assert [m.id for m in models] == JEV_MODELS
    assert JEV_MODELS == ["jev-latest", "typesafe/jev-1.13"]


# --- Result export ----------------------------------------------------------


def _result_row(model_name: str, result: dict) -> dict:
    overall = result["overall_decision"]
    return {
        "title": "The title",
        "abstract": "The abstract",
        "doi": "10.1000/example",
        "human_result": None,
        "model_name": model_name,
        "reason": overall["reason"],
        "binary_decision": str(overall["binary_decision"]).lower(),
        "likert_decision": overall.get("likert_decision"),
        "probability_decision": str(overall["probability_decision"]),
        "inclusion_criteria": json.dumps(result["inclusion_criteria"]),
        "exclusion_criteria": json.dumps(result["exclusion_criteria"]),
        "screening_type": "ZERO_SHOT",
        "error": None,
        "result_mode": None,
        "criterion_results": None,
        "pc_overall_probability": None,
        "pc_binary_decision": None,
    }


@pytest.mark.asyncio
async def test_export_mixes_jev_and_regular_results():
    server = _JevServer({"overall": 0.8, "IC1": 0.9, "IC2": 0.6, "EC1": 0.1})
    jev = await _run(_provider(), server, JevStructuredResponse, ZERO_SHOT_PROMPT)
    decision = {
        "binary_decision": True,
        "probability_decision": 0.7,
        "likert_decision": "6",
        "reason": "Fits.",
    }
    regular = {
        "overall_decision": decision,
        "inclusion_criteria": [{"name": "IC1", "decision": decision}],
        "exclusion_criteria": [],
    }

    df = create_dataframe(
        [
            _result_row("jev-latest", jev.model_dump(mode="json")),
            _result_row("gpt", regular),
        ]
    )

    row = df.iloc[0]
    assert row["jev-latest.ZERO_SHOT.IC1.probability"] == 0.9
    assert row["jev-latest.ZERO_SHOT.EC1.binary"] is False
    assert row["gpt.ZERO_SHOT.IC1.likert"] == "6"
    # Jev has no Likert; pivot_table drops all-empty columns.
    assert "jev-latest.ZERO_SHOT.IC1.likert" not in df.columns
