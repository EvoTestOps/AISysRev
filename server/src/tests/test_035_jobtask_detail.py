import pytest

from src.db.db_context import DBContext
from src.schemas.llm import (
    JevStructuredResponse,
    PerCriteriaResult,
    PromptRecord,
    StructuredResponse,
)
from src.services.jobtask_service import create_jobtask_service
from src.tests.factory import Factory
from src.tests.test_033_jobtask_service import PER_CRITERIA_RESULT, STRUCTURED_RESULT

pytestmark = pytest.mark.asyncio

JEV_RESULT = {
    "overall_decision": {
        "binary_decision": False,
        "probability_decision": 0.2,
        "reason": "TypeSafe Jev probability 0.200",
    },
    "inclusion_criteria": [
        {
            "name": "IC1",
            "decision": {
                "binary_decision": False,
                "probability_decision": 0.2,
                "reason": "TypeSafe Jev probability 0.200",
            },
        }
    ],
    "exclusion_criteria": [],
}

PROMPTS = [
    {"criterion": None, "system_prompt": "You are...", "user_prompt": "Screen this"}
]


async def test_job_tasks_are_listed_in_paper_order_with_errors_and_no_prompts(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)
    second = await factory.paper(project, paper_id=2, title="Second")
    first = await factory.paper(project, paper_id=1, title="First")
    job = await factory.job(project)
    await factory.jobtask(job, second, status="ERROR", error="Rate limited")
    await factory.jobtask(
        job, first, status="DONE", result=STRUCTURED_RESULT, prompts=PROMPTS
    )

    tasks = await create_jobtask_service(db_ctx).fetch_job_tasks(job.uuid, owner.uuid)

    assert [(t.paper_id, t.title) for t in tasks] == [(1, "First"), (2, "Second")]
    assert tasks[1].error == "Rate limited"
    assert not hasattr(tasks[0], "prompts")


@pytest.mark.parametrize(
    ("result", "expected_type"),
    [
        (STRUCTURED_RESULT, StructuredResponse),
        (JEV_RESULT, JevStructuredResponse),
        (PER_CRITERIA_RESULT, PerCriteriaResult),
    ],
)
async def test_job_task_detail_has_the_typed_result_and_prompts(
    db_ctx: DBContext, factory: Factory, result, expected_type
):
    owner = await factory.user()
    project = await factory.project(owner)
    paper = await factory.paper(project, paper_id=7)
    job = await factory.job(project)
    task = await factory.jobtask(
        job, paper, status="DONE", result=result, prompts=PROMPTS
    )

    detail = await create_jobtask_service(db_ctx).fetch_job_task_detail(
        job.uuid, task.uuid, owner.uuid
    )

    assert detail is not None
    assert isinstance(detail.result, expected_type)
    assert detail.paper_id == 7
    assert detail.llm_config.model_name == "test-model"
    assert detail.prompts == [PromptRecord.model_validate(PROMPTS[0])]


async def test_job_task_detail_without_stored_prompts(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)
    job = await factory.job(project)
    task = await factory.jobtask(job, await factory.paper(project))

    detail = await create_jobtask_service(db_ctx).fetch_job_task_detail(
        job.uuid, task.uuid, owner.uuid
    )

    assert detail is not None
    assert detail.prompts is None


async def test_job_task_detail_is_hidden_from_other_owners_and_other_jobs(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    other = await factory.user()
    project = await factory.project(owner)
    paper = await factory.paper(project)
    job = await factory.job(project)
    other_job = await factory.job(project)
    task = await factory.jobtask(job, paper)
    service = create_jobtask_service(db_ctx)

    assert await service.fetch_job_task_detail(job.uuid, task.uuid, other.uuid) is None
    assert (
        await service.fetch_job_task_detail(other_job.uuid, task.uuid, owner.uuid)
        is None
    )
