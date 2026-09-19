import asyncio
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from src.celery import tasks
from src.event_queue import EventName
from src.schemas.job import JobCreate, LLMModelConfig, ZeroShotPromptingConfig

pytestmark = pytest.mark.asyncio

MISSING_JOB_TASK_ID = 2_000_000_000


def _job_data() -> JobCreate:
    return JobCreate(
        project_uuid=uuid4(),
        owner_uuid=uuid4(),
        llm_config=LLMModelConfig(
            provider_name="Test provider",
            model_name="test-model",
            provider_parameters={},
            model_parameters={},
        ),
        prompting_config=ZeroShotPromptingConfig(),
    )


@pytest.mark.parametrize(
    "process, criteria_kwarg",
    [
        (tasks._process_standard_task, "project_criteria"),
        (tasks._process_per_criteria_task, "criteria_tree"),
    ],
    ids=["standard", "per_criteria"],
)
async def test_processing_a_missing_job_task_fails_cleanly(process, criteria_kwarg):
    job_data = _job_data()
    redis = SimpleNamespace(publish=AsyncMock())
    counter = {"completed": 0, "total": 1, "success": 0, "failed": 0}

    with (
        patch.object(tasks, "get_structured_response", AsyncMock()) as llm_call,
        patch.object(tasks, "get_single_criterion_response", AsyncMock()) as llm_leaf,
    ):
        await process(
            celery_task=MagicMock(),
            job_task_id=MISSING_JOB_TASK_ID,
            job_id=1,
            job_data=job_data,
            semaphore=asyncio.Semaphore(1),
            redis=redis,
            counter=counter,
            counter_lock=asyncio.Lock(),
            client=MagicMock(),
            update_interval=1000,
            **{criteria_kwarg: {}},
        )

    # The task is counted as failed, not silently skipped or counted as a success
    assert counter == {"completed": 1, "total": 1, "success": 0, "failed": 1}
    # ...and the LLM was never called for a task that does not exist
    llm_call.assert_not_awaited()
    llm_leaf.assert_not_awaited()
    # The owner is told what happened, with a useful message instead of
    # "'NoneType' object has no attribute 'id'"
    redis.publish.assert_awaited_once()
    channel, payload = redis.publish.await_args.args
    assert str(job_data.owner_uuid) in channel
    event = json.loads(payload)
    assert event["event_name"] == EventName.JOB_TASK_ERROR.value
    assert event["value"]["job_task_id"] == MISSING_JOB_TASK_ID
    assert (
        event["value"]["message"] == f"Job task with id {MISSING_JOB_TASK_ID} not found"
    )
    assert "NoneType" not in event["value"]["message"]
