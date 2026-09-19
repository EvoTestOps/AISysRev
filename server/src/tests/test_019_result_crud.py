import pytest

from src.crud.paper_crud import PaperCrud
from src.crud.result_crud import ResultCrud
from src.db.db_context import DBContext
from src.schemas.paper import PaperHumanResult
from src.tests.factory import Factory

pytestmark = pytest.mark.asyncio


def _result(binary=True, probability=0.85, likert="agree", reason="Relevant"):
    return {
        "overall_decision": {
            "binary_decision": binary,
            "probability_decision": probability,
            "likert_decision": likert,
            "reason": reason,
        },
        "inclusion_criteria": [],
        "exclusion_criteria": [],
    }


async def test_create_result_includes_papers_that_were_never_screened(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)
    await factory.paper(project, title="Unscreened", doi="10.1/x", abstract="Abs")

    rows = await db_ctx.crud(ResultCrud).create_result(project.uuid, owner.uuid)

    assert len(rows) == 1
    row = rows[0]
    assert (row.title, row.doi, row.abstract) == ("Unscreened", "10.1/x", "Abs")
    assert row.human_result is None
    assert row.model_name is None
    assert row.binary_decision is None
    assert row.error is None


async def test_create_result_extracts_the_llm_decision_fields(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)
    paper = await factory.paper(project)
    job = await factory.job(project, model_name="gpt-x")
    await factory.jobtask(
        job,
        paper,
        status="DONE",
        result=_result(binary=False, probability=0.25, likert="disagree", reason="No"),
    )

    rows = await db_ctx.crud(ResultCrud).create_result(project.uuid, owner.uuid)

    assert len(rows) == 1
    row = rows[0]
    assert row.model_name == "gpt-x"
    assert row.screening_type == "ZERO_SHOT"
    assert row.reason == "No"
    assert row.binary_decision == "false"
    assert row.likert_decision == "disagree"
    assert float(row.probability_decision) == pytest.approx(0.25)


async def test_create_result_returns_one_row_per_job_task(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)
    paper = await factory.paper(project)
    job_1 = await factory.job(project, model_name="model-1")
    job_2 = await factory.job(project, model_name="model-2")
    await factory.jobtask(job_1, paper, status="DONE", result=_result())
    await factory.jobtask(job_2, paper, status="DONE", result=_result())

    rows = await db_ctx.crud(ResultCrud).create_result(project.uuid, owner.uuid)

    assert sorted(r.model_name for r in rows) == ["model-1", "model-2"]


async def test_create_result_includes_task_errors(db_ctx: DBContext, factory: Factory):
    owner = await factory.user()
    project = await factory.project(owner)
    paper = await factory.paper(project)
    job = await factory.job(project)
    await factory.jobtask(job, paper, status="ERROR", error="rate limited")

    rows = await db_ctx.crud(ResultCrud).create_result(project.uuid, owner.uuid)

    assert len(rows) == 1
    assert rows[0].error == "rate limited"
    assert rows[0].binary_decision is None


async def test_create_result_includes_the_papers_human_result(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)
    paper = await factory.paper(project)
    await db_ctx.crud(PaperCrud).add_paper_human_result(
        paper.uuid, owner.uuid, PaperHumanResult.INCLUDE
    )

    rows = await db_ctx.crud(ResultCrud).create_result(project.uuid, owner.uuid)

    assert rows[0].human_result is not None
    assert rows[0].human_result.value == "INCLUDE"


async def test_create_result_extracts_per_criteria_fields(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)
    paper = await factory.paper(project)
    job = await factory.job(
        project,
        prompting_config={
            "screening_type": "PER_CRITERIA",
            "screening_target": "PAPER",
        },
    )
    await factory.jobtask(
        job,
        paper,
        status="DONE",
        result={
            "mode": "PER_CRITERIA",
            "overall_probability": 0.7,
            "binary_decision": True,
            "criterion_results": [{"name": "IC1"}],
        },
    )

    rows = await db_ctx.crud(ResultCrud).create_result(project.uuid, owner.uuid)

    row = rows[0]
    assert row.screening_type == "PER_CRITERIA"
    assert row.result_mode == "PER_CRITERIA"
    assert float(row.pc_overall_probability) == pytest.approx(0.7)
    assert row.pc_binary_decision == "true"
    assert "IC1" in row.criterion_results
    assert row.reason is None


async def test_create_result_only_covers_the_given_project(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)
    other_project = await factory.project(owner)
    await factory.paper(project, title="mine")
    await factory.paper(other_project, title="other")

    rows = await db_ctx.crud(ResultCrud).create_result(project.uuid, owner.uuid)

    assert [r.title for r in rows] == ["mine"]


async def test_create_result_is_empty_for_other_owner(
    db_ctx: DBContext, factory: Factory
):
    alice = await factory.user()
    bob = await factory.user()
    project = await factory.project(alice)
    paper = await factory.paper(project)
    await factory.jobtask(await factory.job(project), paper, "DONE", _result())

    assert await db_ctx.crud(ResultCrud).create_result(project.uuid, bob.uuid) == []
