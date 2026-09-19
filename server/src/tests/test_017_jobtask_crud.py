import pytest

from src.crud.jobtask_crud import JobTaskCrud
from src.db.db_context import DBContext
from src.schemas.jobtask import JobTaskCreate, JobTaskHumanResult, JobTaskStatus
from src.schemas.llm import Decision, LikertDecision, StructuredResponse
from src.schemas.paper import PaperCreate
from src.tests.factory import Factory

pytestmark = pytest.mark.asyncio


async def _job_with_tasks(factory: Factory, statuses, owner=None):
    """A project with one job and one task per given status."""
    owner = owner or await factory.user()
    project = await factory.project(owner)
    job = await factory.job(project)
    tasks = []
    for status in statuses:
        paper = await factory.paper(project)
        tasks.append(await factory.jobtask(job, paper, status=status))
    return owner, project, job, tasks


# --- creating ---------------------------------------------------------------


async def test_bulk_create_papers_creates_papers(db_ctx: DBContext, factory: Factory):
    owner = await factory.user()
    project = await factory.project(owner)
    file = await factory.file(project)

    created = await db_ctx.crud(JobTaskCrud).bulk_create_papers(
        [
            PaperCreate(
                paper_id=i,
                project_uuid=project.uuid,
                file_uuid=file.uuid,
                doi=None,
                title=f"T{i}",
                abstract="A",
            )
            for i in (1, 2)
        ]
    )

    assert [p.title for p in created] == ["T1", "T2"]
    assert all(p.uuid is not None for p in created)


async def test_bulk_create_jobtasks_defaults_to_not_started(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)
    job = await factory.job(project)
    papers = [await factory.paper(project) for _ in range(2)]

    created = await db_ctx.crud(JobTaskCrud).bulk_create_jobtasks(
        [
            JobTaskCreate(
                job_id=job.id,
                doi=p.doi,
                title=p.title,
                abstract=p.abstract,
                paper_uuid=p.uuid,
            )
            for p in papers
        ]
    )

    assert len(created) == 2
    assert {t.status.value for t in created} == {"NOT_STARTED"}
    assert all(t.job_id == job.id for t in created)
    assert all(t.result is None and t.error is None for t in created)


async def test_bulk_create_jobtasks_keeps_pdf_file_reference(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)
    job = await factory.job(project)
    pdf = await factory.file(project, mime_type="application/pdf")
    paper = await factory.paper(project, pdf_file=pdf)

    created = await db_ctx.crud(JobTaskCrud).bulk_create_jobtasks(
        [
            JobTaskCreate(
                job_id=job.id,
                doi=None,
                title="t",
                abstract="a",
                paper_uuid=paper.uuid,
                pdf_file_uuid=pdf.uuid,
            )
        ]
    )

    assert created[0].pdf_file_uuid == pdf.uuid


# --- fetching ---------------------------------------------------------------


async def test_fetch_job_tasks_by_job_id(db_ctx: DBContext, factory: Factory):
    _, project, job, tasks = await _job_with_tasks(factory, ["DONE", "ERROR"])
    other_job = await factory.job(project)
    await factory.jobtask(other_job, await factory.paper(project))

    found = await db_ctx.crud(JobTaskCrud).fetch_job_tasks_by_job_id(job.id)

    assert sorted(t.id for t in found) == sorted(t.id for t in tasks)


async def test_fetch_job_tasks_by_job_id_is_empty_for_unknown_job(db_ctx: DBContext):
    assert await db_ctx.crud(JobTaskCrud).fetch_job_tasks_by_job_id(-1) == []


async def test_fetch_job_tasks_by_job_uuid(db_ctx: DBContext, factory: Factory):
    owner, _, job, tasks = await _job_with_tasks(factory, ["DONE", "PENDING"])

    found = await db_ctx.crud(JobTaskCrud).fetch_job_tasks_by_job_uuid(
        job.uuid, owner.uuid
    )

    assert sorted(t.id for t in found) == sorted(t.id for t in tasks)


async def test_fetch_job_tasks_by_job_uuid_is_empty_for_other_owner(
    db_ctx: DBContext, factory: Factory
):
    _, _, job, _ = await _job_with_tasks(factory, ["DONE"])
    bob = await factory.user()

    found = await db_ctx.crud(JobTaskCrud).fetch_job_tasks_by_job_uuid(
        job.uuid, bob.uuid
    )

    assert found == []


async def test_fetch_job_task_by_id(db_ctx: DBContext, factory: Factory):
    _, _, _, tasks = await _job_with_tasks(factory, ["DONE"])
    crud = db_ctx.crud(JobTaskCrud)

    found = await crud.fetch_job_task_by_id(tasks[0].id)

    assert found is not None
    assert found.uuid == tasks[0].uuid
    assert await crud.fetch_job_task_by_id(-1) is None


async def test_fetch_job_task_by_id_or_throw_returns_the_task(
    db_ctx: DBContext, factory: Factory
):
    _, _, _, tasks = await _job_with_tasks(factory, ["DONE"])

    found = await db_ctx.crud(JobTaskCrud).fetch_job_task_by_id_or_throw(tasks[0].id)

    assert found.uuid == tasks[0].uuid


async def test_fetch_job_task_by_id_or_throw_raises_when_missing(db_ctx: DBContext):
    with pytest.raises(ValueError, match="Job task with id -1 not found"):
        await db_ctx.crud(JobTaskCrud).fetch_job_task_by_id_or_throw(-1)


async def test_fetch_job_tasks_by_paper_uuid_returns_task_and_job(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)
    paper = await factory.paper(project)
    job_1 = await factory.job(project, model_name="model-1")
    job_2 = await factory.job(project, model_name="model-2")
    await factory.jobtask(job_1, paper, status="DONE")
    await factory.jobtask(job_2, paper, status="ERROR")
    await factory.jobtask(job_1, await factory.paper(project), status="DONE")

    rows = await db_ctx.crud(JobTaskCrud).fetch_job_tasks_by_paper_uuid(
        paper.uuid, owner.uuid
    )

    assert len(rows) == 2
    assert all(task.paper_uuid == paper.uuid for task, _ in rows)
    assert sorted(job.llm_config["model_name"] for _, job in rows) == [
        "model-1",
        "model-2",
    ]


async def test_fetch_job_tasks_by_paper_uuid_is_empty_for_other_owner(
    db_ctx: DBContext, factory: Factory
):
    _, project, _, tasks = await _job_with_tasks(factory, ["DONE"])
    bob = await factory.user()

    rows = await db_ctx.crud(JobTaskCrud).fetch_job_tasks_by_paper_uuid(
        tasks[0].paper_uuid, bob.uuid
    )

    assert rows == []


# --- stats ------------------------------------------------------------------


async def test_fetch_task_stats_by_job_counts_each_status(
    db_ctx: DBContext, factory: Factory
):
    _, _, job, _ = await _job_with_tasks(
        factory, ["DONE", "DONE", "ERROR", "CANCELLED", "PENDING", "RUNNING"]
    )

    stats = await db_ctx.crud(JobTaskCrud).fetch_task_stats_by_job(job.id)

    assert stats is not None
    assert stats["total_count"] == 6
    assert stats["success_count"] == 2
    assert stats["failed_count"] == 1
    assert stats["cancelled_count"] == 1


async def test_fetch_task_stats_by_job_is_none_for_job_without_tasks(
    db_ctx: DBContext, factory: Factory
):
    project = await factory.project(await factory.user())
    job = await factory.job(project)

    assert await db_ctx.crud(JobTaskCrud).fetch_task_stats_by_job(job.id) is None


async def test_fetch_tasks_stats_by_project_groups_per_job(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)
    job_1 = await factory.job(project)
    job_2 = await factory.job(project)
    other_project = await factory.project(owner)
    other_job = await factory.job(other_project)
    for status in ("DONE", "DONE", "ERROR"):
        await factory.jobtask(job_1, await factory.paper(project), status=status)
    await factory.jobtask(job_2, await factory.paper(project), status="CANCELLED")
    await factory.jobtask(other_job, await factory.paper(other_project), status="DONE")

    rows = await db_ctx.crud(JobTaskCrud).fetch_tasks_stats_by_project(
        project.uuid, owner.uuid
    )

    by_job = {r["job_uuid"]: r for r in rows}
    assert set(by_job) == {job_1.uuid, job_2.uuid}
    assert (
        by_job[job_1.uuid]["total_count"],
        by_job[job_1.uuid]["success_count"],
        by_job[job_1.uuid]["failed_count"],
        by_job[job_1.uuid]["cancelled_count"],
    ) == (3, 2, 1, 0)
    assert (
        by_job[job_2.uuid]["total_count"],
        by_job[job_2.uuid]["cancelled_count"],
    ) == (1, 1)


async def test_fetch_tasks_stats_by_project_is_empty_for_other_owner(
    db_ctx: DBContext, factory: Factory
):
    _, project, _, _ = await _job_with_tasks(factory, ["DONE"])
    bob = await factory.user()

    rows = await db_ctx.crud(JobTaskCrud).fetch_tasks_stats_by_project(
        project.uuid, bob.uuid
    )

    assert rows == []


async def test_fetch_tasks_stats_by_owner_covers_all_of_the_owners_jobs(
    db_ctx: DBContext, factory: Factory
):
    alice, _, job_1, _ = await _job_with_tasks(factory, ["DONE", "ERROR"])
    _, _, job_2, _ = await _job_with_tasks(factory, ["DONE"], owner=alice)
    await _job_with_tasks(factory, ["DONE", "DONE", "DONE"])  # someone else's

    rows = await db_ctx.crud(JobTaskCrud).fetch_tasks_stats_by_owner(alice.uuid)

    by_job = {r["job_uuid"]: r for r in rows}
    assert set(by_job) == {job_1.uuid, job_2.uuid}
    assert by_job[job_1.uuid]["total_count"] == 2
    assert by_job[job_1.uuid]["failed_count"] == 1
    assert by_job[job_2.uuid]["success_count"] == 1


# --- status updates ---------------------------------------------------------


async def test_update_job_task_status_changes_only_that_task(
    db_ctx: DBContext, factory: Factory
):
    _, _, _, tasks = await _job_with_tasks(factory, ["NOT_STARTED", "NOT_STARTED"])
    crud = db_ctx.crud(JobTaskCrud)

    await crud.update_job_task_status(tasks[0].id, JobTaskStatus.RUNNING.value)

    await factory.reload(tasks[0])
    await factory.reload(tasks[1])
    assert tasks[0].status.value == "RUNNING"
    assert tasks[1].status.value == "NOT_STARTED"


async def test_update_job_tasks_status_changes_every_task_of_the_job(
    db_ctx: DBContext, factory: Factory
):
    _, project, job, tasks = await _job_with_tasks(factory, ["DONE", "ERROR"])
    other_job = await factory.job(project)
    other_task = await factory.jobtask(
        other_job, await factory.paper(project), status="DONE"
    )

    await db_ctx.crud(JobTaskCrud).update_job_tasks_status(
        job.id, JobTaskStatus.PENDING.value
    )

    for task in (*tasks, other_task):
        await factory.reload(task)
    assert [t.status.value for t in tasks] == ["PENDING", "PENDING"]
    assert other_task.status.value == "DONE"


async def test_cancel_only_affects_unfinished_tasks(
    db_ctx: DBContext, factory: Factory
):
    _, _, job, tasks = await _job_with_tasks(
        factory, ["NOT_STARTED", "PENDING", "RUNNING", "DONE", "ERROR", "CANCELLED"]
    )

    await db_ctx.crud(JobTaskCrud).update_job_tasks_status_to_cancelled(job.id)

    for task in tasks:
        await factory.reload(task)
    assert [t.status.value for t in tasks] == [
        "CANCELLED",
        "CANCELLED",
        "CANCELLED",
        "DONE",
        "ERROR",
        "CANCELLED",
    ]


async def test_cancel_does_not_touch_other_jobs(db_ctx: DBContext, factory: Factory):
    _, project, job, _ = await _job_with_tasks(factory, ["RUNNING"])
    other_job = await factory.job(project)
    other_task = await factory.jobtask(
        other_job, await factory.paper(project), status="RUNNING"
    )

    await db_ctx.crud(JobTaskCrud).update_job_tasks_status_to_cancelled(job.id)

    await factory.reload(other_task)
    assert other_task.status.value == "RUNNING"


# --- results and errors -----------------------------------------------------


async def test_update_job_task_result_stores_a_dict(
    db_ctx: DBContext, factory: Factory
):
    _, _, _, tasks = await _job_with_tasks(factory, ["RUNNING"])

    await db_ctx.crud(JobTaskCrud).update_job_task_result(
        tasks[0].id, {"overall_decision": {"binary_decision": True}}
    )

    await factory.reload(tasks[0])
    assert tasks[0].result == {"overall_decision": {"binary_decision": True}}


async def test_update_job_task_result_serialises_pydantic_models(
    db_ctx: DBContext, factory: Factory
):
    _, _, _, tasks = await _job_with_tasks(factory, ["RUNNING"])
    response = StructuredResponse(
        overall_decision=Decision(
            binary_decision=True,
            probability_decision=0.9,
            likert_decision=LikertDecision.agree,
            reason="Looks relevant",
        ),
        inclusion_criteria=[],
        exclusion_criteria=[],
    )

    await db_ctx.crud(JobTaskCrud).update_job_task_result(tasks[0].id, response)

    await factory.reload(tasks[0])
    assert tasks[0].result is not None
    decision = tasks[0].result["overall_decision"]
    assert decision["binary_decision"] is True
    assert decision["probability_decision"] == 0.9
    assert decision["reason"] == "Looks relevant"


async def test_update_job_task_error_stores_the_message(
    db_ctx: DBContext, factory: Factory
):
    _, _, _, tasks = await _job_with_tasks(factory, ["RUNNING"])

    await db_ctx.crud(JobTaskCrud).update_job_task_error(tasks[0].id, "boom")

    await factory.reload(tasks[0])
    assert tasks[0].error == "boom"


# --- per-criteria and human results ----------------------------------------


async def test_fetch_per_criteria_tasks_returns_only_finished_per_criteria_tasks(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)
    per_criteria = await factory.job(
        project,
        prompting_config={
            "screening_type": "PER_CRITERIA",
            "screening_target": "PAPER",
        },
    )
    zero_shot = await factory.job(project)
    done_paper = await factory.paper(project)
    await factory.jobtask(
        per_criteria, done_paper, status="DONE", result={"mode": "PER_CRITERIA"}
    )
    await factory.jobtask(per_criteria, await factory.paper(project), status="ERROR")
    await factory.jobtask(per_criteria, await factory.paper(project), status="RUNNING")
    await factory.jobtask(
        zero_shot, await factory.paper(project), status="DONE", result={}
    )

    rows = await db_ctx.crud(JobTaskCrud).fetch_per_criteria_tasks_by_project(
        project.uuid, owner.uuid
    )

    assert len(rows) == 1
    assert rows[0]["paper_uuid"] == done_paper.uuid
    assert rows[0]["job_uuid"] == per_criteria.uuid
    assert rows[0]["result"] == {"mode": "PER_CRITERIA"}


async def test_fetch_per_criteria_tasks_is_empty_for_other_owner(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)
    job = await factory.job(
        project,
        prompting_config={
            "screening_type": "PER_CRITERIA",
            "screening_target": "PAPER",
        },
    )
    await factory.jobtask(job, await factory.paper(project), status="DONE", result={})
    bob = await factory.user()

    rows = await db_ctx.crud(JobTaskCrud).fetch_per_criteria_tasks_by_project(
        project.uuid, bob.uuid
    )

    assert rows == []


async def test_add_jobtask_human_result_stores_the_decision(
    db_ctx: DBContext, factory: Factory
):
    owner, _, _, tasks = await _job_with_tasks(factory, ["DONE"])

    await db_ctx.crud(JobTaskCrud).add_jobtask_human_result(
        tasks[0].uuid, owner.uuid, JobTaskHumanResult.INCLUDE
    )

    found = await db_ctx.crud(JobTaskCrud).fetch_job_task_by_id(tasks[0].id)
    assert found is not None
    assert found.human_result is not None
    assert found.human_result.value == "INCLUDE"


async def test_add_jobtask_human_result_ignores_other_owners(
    db_ctx: DBContext, factory: Factory
):
    _, _, _, tasks = await _job_with_tasks(factory, ["DONE"])
    bob = await factory.user()

    await db_ctx.crud(JobTaskCrud).add_jobtask_human_result(
        tasks[0].uuid, bob.uuid, JobTaskHumanResult.INCLUDE
    )

    await factory.reload(tasks[0])
    assert tasks[0].human_result is None
