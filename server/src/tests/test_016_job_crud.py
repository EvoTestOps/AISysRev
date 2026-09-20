from uuid import uuid4

import pytest

from src.crud.job_crud import JobCrud
from src.crud.jobtask_crud import JobTaskCrud
from src.db.db_context import DBContext
from src.schemas.job import (
    FewShotPromptingConfig,
    JobCreate,
    JobScreeningMode,
    LLMModelConfig,
    PerCriteriaPromptingConfig,
    ZeroShotPromptingConfig,
)
from src.tests.factory import Factory

pytestmark = pytest.mark.asyncio


def _job_data(project, owner, **kwargs) -> JobCreate:
    return JobCreate(
        project_uuid=project.uuid,
        owner_uuid=owner.uuid,
        llm_config=LLMModelConfig(
            provider_name="Test provider",
            model_name=kwargs.pop("model_name", "test-model"),
            provider_parameters={"base_url": "http://localhost"},
            model_parameters={"temperature": 0.2},
        ),
        prompting_config=kwargs.pop("prompting_config", ZeroShotPromptingConfig()),
        **kwargs,
    )


async def test_create_job_stores_configs_and_defaults(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)

    job = await db_ctx.crud(JobCrud).create_job(_job_data(project, owner))

    assert job.id is not None
    assert job.uuid is not None
    assert job.project_id == project.id
    assert job.llm_config["model_name"] == "test-model"
    assert job.llm_config["model_parameters"] == {"temperature": 0.2}
    assert job.prompting_config["screening_type"] == "ZERO_SHOT"
    assert job.screening_mode == JobScreeningMode.TEXT
    assert job.celery_task_id is None


@pytest.mark.parametrize(
    "prompting_config, expected_type",
    [
        (ZeroShotPromptingConfig(), "ZERO_SHOT"),
        (PerCriteriaPromptingConfig(), "PER_CRITERIA"),
        (
            FewShotPromptingConfig(
                seed_paper_inc=["a"], seed_paper_exc=["b"], remember_selection=True
            ),
            "FEW_SHOT",
        ),
    ],
)
async def test_create_job_stores_each_prompting_config(
    db_ctx: DBContext, factory: Factory, prompting_config, expected_type
):
    owner = await factory.user()
    project = await factory.project(owner)

    job = await db_ctx.crud(JobCrud).create_job(
        _job_data(project, owner, prompting_config=prompting_config)
    )

    assert job.prompting_config["screening_type"] == expected_type


@pytest.mark.parametrize("mode", list(JobScreeningMode))
async def test_create_job_stores_screening_mode(
    db_ctx: DBContext, factory: Factory, mode
):
    owner = await factory.user()
    project = await factory.project(owner)

    job = await db_ctx.crud(JobCrud).create_job(
        _job_data(project, owner, screening_mode=mode)
    )

    assert job.screening_mode == mode


async def test_create_job_fails_for_unknown_project(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)
    data = _job_data(project, owner)
    data.project_uuid = uuid4()

    with pytest.raises(ValueError, match="not found"):
        await db_ctx.crud(JobCrud).create_job(data)


async def test_create_job_fails_for_projects_of_other_owners(
    db_ctx: DBContext, factory: Factory
):
    alice = await factory.user()
    bob = await factory.user()
    project = await factory.project(alice)

    with pytest.raises(ValueError, match="not found"):
        await db_ctx.crud(JobCrud).create_job(_job_data(project, bob))


async def test_fetch_jobs_returns_only_the_owners_jobs(
    db_ctx: DBContext, factory: Factory
):
    alice = await factory.user()
    bob = await factory.user()
    alice_project = await factory.project(alice)
    mine_1 = await factory.job(alice_project)
    mine_2 = await factory.job(await factory.project(alice))
    await factory.job(await factory.project(bob))

    jobs = await db_ctx.crud(JobCrud).fetch_jobs(alice.uuid)

    assert sorted(j["uuid"] for j in jobs) == sorted([mine_1.uuid, mine_2.uuid])


async def test_fetch_jobs_includes_project_uuid_and_configs(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)
    job = await factory.job(project, model_name="gpt-x")

    jobs = await db_ctx.crud(JobCrud).fetch_jobs(owner.uuid)

    assert len(jobs) == 1
    assert jobs[0]["uuid"] == job.uuid
    assert jobs[0]["id"] == job.id
    assert jobs[0]["project_uuid"] == project.uuid
    assert jobs[0]["llm_config"]["model_name"] == "gpt-x"
    assert jobs[0]["screening_mode"] == JobScreeningMode.TEXT


async def test_fetch_jobs_is_empty_for_owner_without_jobs(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()

    assert await db_ctx.crud(JobCrud).fetch_jobs(owner.uuid) == []


async def test_fetch_jobs_by_project_is_scoped_to_the_project(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)
    other_project = await factory.project(owner)
    mine = await factory.job(project)
    await factory.job(other_project)

    jobs = await db_ctx.crud(JobCrud).fetch_jobs_by_project(project.uuid, owner.uuid)

    assert [j["uuid"] for j in jobs] == [mine.uuid]


async def test_fetch_jobs_by_project_is_empty_for_other_owner(
    db_ctx: DBContext, factory: Factory
):
    alice = await factory.user()
    bob = await factory.user()
    project = await factory.project(alice)
    await factory.job(project)

    jobs = await db_ctx.crud(JobCrud).fetch_jobs_by_project(project.uuid, bob.uuid)

    assert jobs == []


async def test_fetch_job_by_uuid(db_ctx: DBContext, factory: Factory):
    owner = await factory.user()
    project = await factory.project(owner)
    job = await factory.job(project)

    found = await db_ctx.crud(JobCrud).fetch_job_by_uuid(job.uuid, owner.uuid)

    assert found["uuid"] == job.uuid
    assert found["project_uuid"] == project.uuid


async def test_fetch_job_by_uuid_raises_for_unknown_job(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()

    with pytest.raises(ValueError, match="not found"):
        await db_ctx.crud(JobCrud).fetch_job_by_uuid(uuid4(), owner.uuid)


async def test_fetch_job_by_uuid_raises_for_other_owner(
    db_ctx: DBContext, factory: Factory
):
    alice = await factory.user()
    bob = await factory.user()
    job = await factory.job(await factory.project(alice))

    with pytest.raises(ValueError, match="not found"):
        await db_ctx.crud(JobCrud).fetch_job_by_uuid(job.uuid, bob.uuid)


async def test_fetch_job_by_uuid_with_ids_includes_internal_ids(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    job = await factory.job(await factory.project(owner))
    task_id = uuid4()
    crud = db_ctx.crud(JobCrud)
    await crud.update_celery_task_id(job.uuid, task_id)

    found = await crud.fetch_job_by_uuid_with_ids(job.uuid, owner.uuid)

    assert found["id"] == job.id
    assert found["celery_task_id"] == task_id


async def test_fetch_job_by_uuid_with_ids_raises_for_other_owner(
    db_ctx: DBContext, factory: Factory
):
    alice = await factory.user()
    bob = await factory.user()
    job = await factory.job(await factory.project(alice))

    with pytest.raises(ValueError, match="not found"):
        await db_ctx.crud(JobCrud).fetch_job_by_uuid_with_ids(job.uuid, bob.uuid)


async def test_celery_task_id_is_none_until_set(db_ctx: DBContext, factory: Factory):
    job = await factory.job(await factory.project(await factory.user()))

    assert await db_ctx.crud(JobCrud).fetch_celery_task_id(job.uuid) is None


async def test_update_and_fetch_celery_task_id(db_ctx: DBContext, factory: Factory):
    job = await factory.job(await factory.project(await factory.user()))
    crud = db_ctx.crud(JobCrud)
    first, second = uuid4(), uuid4()

    await crud.update_celery_task_id(job.uuid, first)
    assert await crud.fetch_celery_task_id(job.uuid) == first

    await crud.update_celery_task_id(job.uuid, second)
    assert await crud.fetch_celery_task_id(job.uuid) == second


async def test_update_celery_task_id_only_touches_the_given_job(
    db_ctx: DBContext, factory: Factory
):
    project = await factory.project(await factory.user())
    job = await factory.job(project)
    other = await factory.job(project)
    crud = db_ctx.crud(JobCrud)

    await crud.update_celery_task_id(job.uuid, uuid4())

    assert await crud.fetch_celery_task_id(other.uuid) is None


async def test_delete_job_removes_it(db_ctx: DBContext, factory: Factory):
    owner = await factory.user()
    job = await factory.job(await factory.project(owner))
    crud = db_ctx.crud(JobCrud)

    await crud.delete_job(job.uuid, owner.uuid)
    await factory.flush()

    assert await crud.fetch_jobs(owner.uuid) == []


async def test_delete_job_does_nothing_for_other_owner(
    db_ctx: DBContext, factory: Factory
):
    alice = await factory.user()
    bob = await factory.user()
    job = await factory.job(await factory.project(alice))
    crud = db_ctx.crud(JobCrud)

    await crud.delete_job(job.uuid, bob.uuid)
    await factory.flush()

    assert len(await crud.fetch_jobs(alice.uuid)) == 1


async def test_delete_job_cascades_to_its_job_tasks(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)
    job = await factory.job(project)
    await factory.jobtask(job, await factory.paper(project))

    await db_ctx.crud(JobCrud).delete_job(job.uuid, owner.uuid)
    await factory.flush()

    assert await db_ctx.crud(JobTaskCrud).fetch_job_tasks_by_job_id(job.id) == []
