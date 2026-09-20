from unittest.mock import MagicMock, patch

import pytest
from httpx2 import AsyncClient
from pydantic_ai import Agent

from src.core.llm.providers.mock import (
    CHARS_PER_TOKEN,
    EMBEDDING_DIM,
    MOCK_MODEL_PROFILES,
    MockProvider,
)
from src.schemas.llm import (
    CriterionResponse,
    ProviderRuntimeParameters,
    StructuredResponse,
)
from src.tools.llm_decision_creator import create_criteria

PROVIDER_PARAMS = {"delay": 0, "delay_jitter": 0}


def _provider(model: str | None = "mock-small") -> MockProvider:
    return MockProvider(PROVIDER_PARAMS, ProviderRuntimeParameters(model=model))


async def _run(provider: MockProvider, schema, prompt: str):
    return await provider.generate_answer_async(
        client=MagicMock(spec=AsyncClient),
        model_parameters={},
        schema=schema,
        prompt=prompt,
    )


@pytest.mark.unit
@pytest.mark.asyncio
async def test_criterion_response_matches_model_profile():
    result = await _run(_provider("mock-small"), CriterionResponse, "prompt")

    assert isinstance(result, CriterionResponse)
    assert result.probability_decision == 1.0
    average_chars = (
        MOCK_MODEL_PROFILES["mock-small"].criteria_reason_tokens * CHARS_PER_TOKEN
    )
    assert average_chars * 0.7 - CHARS_PER_TOKEN <= len(result.reason)
    assert len(result.reason) <= average_chars * 1.3 + CHARS_PER_TOKEN


@pytest.mark.unit
@pytest.mark.asyncio
async def test_structured_response_follows_criteria_in_prompt():
    prompt = create_criteria(["a", "b", "c"], ["d", "e"])

    result = await _run(_provider(), StructuredResponse, prompt)

    assert isinstance(result, StructuredResponse)
    assert [c.name for c in result.inclusion_criteria] == ["IC1", "IC2", "IC3"]
    assert [c.name for c in result.exclusion_criteria] == ["EC1", "EC2"]
    assert all(c.decision.binary_decision for c in result.inclusion_criteria)
    assert not any(c.decision.binary_decision for c in result.exclusion_criteria)
    assert result.overall_decision.binary_decision is True


@pytest.mark.unit
@pytest.mark.asyncio
async def test_structured_response_defaults_to_one_criterion_each():
    result = await _run(_provider(), StructuredResponse, "no criteria here")

    assert len(result.inclusion_criteria) == 1
    assert len(result.exclusion_criteria) == 1


@pytest.mark.unit
@pytest.mark.asyncio
async def test_missing_model_uses_default_profile():
    result = await _run(_provider(None), CriterionResponse, "prompt")

    assert isinstance(result, CriterionResponse)


@pytest.mark.unit
@pytest.mark.asyncio
async def test_unknown_model_raises_value_error():
    with pytest.raises(ValueError, match="Unknown mock model"):
        await _run(_provider("gpt-nope"), CriterionResponse, "prompt")


@pytest.mark.unit
@pytest.mark.asyncio
async def test_response_goes_through_pydantic_ai_agent():
    with patch.object(Agent, "run", autospec=True, side_effect=Agent.run) as run:
        await _run(_provider(), CriterionResponse, "prompt")

    run.assert_awaited_once()


@pytest.mark.unit
@pytest.mark.asyncio
async def test_embeddings_have_expected_shape():
    embeddings = await _provider().embed_async(MagicMock(spec=AsyncClient), ["a", "b"])

    assert len(embeddings) == 2
    assert all(len(e) == EMBEDDING_DIM for e in embeddings)
