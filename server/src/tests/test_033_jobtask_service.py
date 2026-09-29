import pytest

from src.db.db_context import DBContext
from src.schemas.job import FewShotPromptingConfig, JobScreeningMode
from src.schemas.llm import (
    CriterionError,
    CriterionResponse,
    PerCriteriaResult,
    StructuredResponse,
)
from src.services.jobtask_service import create_jobtask_service
from src.tests.factory import Factory

pytestmark = pytest.mark.asyncio

STRUCTURED_RESULT = {
    "overall_decision": {
        "binary_decision": True,
        "probability_decision": 0.8,
        "likert_decision": "6",
        "reason": "Relevant",
    },
    "inclusion_criteria": [
        {
            "name": "IC1",
            "decision": {
                "binary_decision": True,
                "probability_decision": 0.9,
                "likert_decision": "7",
                "reason": "Matches",
            },
        }
    ],
    "exclusion_criteria": [],
}

PER_CRITERIA_RESULT = {
    "mode": "PER_CRITERIA",
    "criterion_results": {
        "IC1": {"probability_decision": 0.7, "reason": "Likely"},
        "EC1": {"error": "LLM call failed"},
    },
    "inclusion_probability": 0.7,
    "exclusion_probability": None,
    "overall_probability": 0.7,
    "binary_decision": True,
}


async def test_fetch_job_tasks_for_paper_parses_typed_fields(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)
    paper = await factory.paper(project)
    few_shot = await factory.job(
        project,
        prompting_config={
            "screening_type": "FEW_SHOT",
            "screening_target": "PAPER",
            "seed_paper_inc": ["a"],
            "seed_paper_exc": ["b"],
            "remember_selection": False,
        },
        screening_mode=JobScreeningMode.PDF,
    )
    per_criteria = await factory.job(
        project,
        prompting_config={
            "screening_type": "PER_CRITERIA",
            "screening_target": "PAPER",
        },
    )
    pending = await factory.job(project)
    await factory.jobtask(few_shot, paper, status="DONE", result=STRUCTURED_RESULT)
    await factory.jobtask(
        per_criteria, paper, status="DONE", result=PER_CRITERIA_RESULT
    )
    await factory.jobtask(pending, paper)

    tasks = await create_jobtask_service(db_ctx).fetch_job_tasks_for_paper(
        paper.uuid, owner.uuid
    )
    by_job = {t.job_id: t for t in tasks}

    few_shot_task = by_job[few_shot.id]
    assert isinstance(few_shot_task.result, StructuredResponse)
    assert few_shot_task.result.overall_decision.probability_decision == 0.8
    assert isinstance(few_shot_task.prompting_config, FewShotPromptingConfig)
    assert few_shot_task.llm_config.model_name == "test-model"
    assert few_shot_task.screening_mode == JobScreeningMode.PDF

    per_criteria_task = by_job[per_criteria.id]
    assert isinstance(per_criteria_task.result, PerCriteriaResult)
    assert isinstance(
        per_criteria_task.result.criterion_results["IC1"], CriterionResponse
    )
    assert isinstance(per_criteria_task.result.criterion_results["EC1"], CriterionError)

    assert by_job[pending.id].result is None
