from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from src.core.prompts import DEFAULT_PROMPTS, DefaultPrompt
from src.crud.job_crud import JobCrud
from src.db.db_context import DBContext
from src.schemas.job import (
    JobCreate,
    JobPromptingType,
    LLMModelConfig,
    PerCriteriaPromptingConfig,
)
from src.schemas.project import ScreeningTarget
from src.schemas.prompt import PromptCreateRequest, PromptText
from src.services.job_service import JobService
from src.services.prompt_service import (
    PromptNotFoundError,
    PromptReadOnlyError,
    create_prompt_service,
)
from src.tests.factory import Factory

pytestmark = pytest.mark.asyncio

ZERO = JobPromptingType.ZERO_SHOT
PAPER = ScreeningTarget.PAPER
USER_PROMPT = "{{title}}\n{{abstract}}\n{{criteria}}"


def _create(name="Mine", **kwargs) -> PromptCreateRequest:
    return PromptCreateRequest(
        name=name,
        prompting_type=kwargs.pop("prompting_type", ZERO),
        system_prompt=kwargs.pop("system_prompt", "Be careful."),
        user_prompt=kwargs.pop("user_prompt", USER_PROMPT),
        **kwargs,
    )


def _version(user_prompt=USER_PROMPT, system_prompt="Be careful.", note=None):
    return PromptText(
        system_prompt=system_prompt, user_prompt=user_prompt, change_note=note
    )


# --- versions and ownership ------------------------------------------------


async def test_a_prompts_versions(db_ctx: DBContext, factory: Factory):
    owner = await factory.user()
    service = create_prompt_service(db_ctx)

    created = await service.create_prompt(
        owner.uuid, _create(name=" Mine ", change_note="First")
    )
    assert (created.name, created.is_default) == ("Mine", False)
    assert created.latest_version.change_note == "First"

    # Unchanged text adds no version; new text adds one and keeps the old.
    await service.add_version(created.uuid, owner.uuid, _version())
    detail = await service.add_version(
        created.uuid, owner.uuid, _version(USER_PROMPT + "\nThink.", note="Tweak")
    )
    assert [v.version for v in detail.versions] == [2, 1]
    assert detail.versions[0].change_note == "Tweak"
    assert detail.versions[1].user_prompt == USER_PROMPT

    # The text is checked against the prompt's type.
    with pytest.raises(ValueError, match="criterion"):
        await service.add_version(
            created.uuid, owner.uuid, _version("{{title}} {{abstract}} {{criterion}}")
        )
    with pytest.raises(ValueError, match="Unknown variable"):
        await service.create_prompt(owner.uuid, _create(user_prompt="{{bogus}}"))


async def test_other_users_and_deleted_prompts(db_ctx: DBContext, factory: Factory):
    alice = await factory.user()
    bob = await factory.user()
    service = create_prompt_service(db_ctx)
    created = await service.create_prompt(alice.uuid, _create())

    assert created.uuid not in [p.uuid for p in await service.list_prompts(bob.uuid)]
    for call in (
        service.get_prompt(created.uuid, bob.uuid),
        service.add_version(created.uuid, bob.uuid, _version()),
        service.archive_prompt(created.uuid, bob.uuid),
    ):
        with pytest.raises(PromptNotFoundError):
            await call

    await service.archive_prompt(created.uuid, alice.uuid)

    assert created.uuid not in [p.uuid for p in await service.list_prompts(alice.uuid)]
    assert (await service.get_prompt(created.uuid, alice.uuid)).archived is True
    with pytest.raises(PromptReadOnlyError):
        await service.add_version(created.uuid, alice.uuid, _version("x {{title}}"))


async def test_the_list_is_filtered_by_type_and_target(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    service = create_prompt_service(db_ctx)
    await service.sync_default_prompts()
    mine = await service.create_prompt(owner.uuid, _create())

    listed = await service.list_prompts(owner.uuid, ZERO, PAPER)

    assert [p.uuid for p in listed][-1] == mine.uuid
    assert all(p.prompting_type == ZERO for p in listed)
    assert all(p.screening_target == PAPER for p in listed)
    # The built-in prompt comes first.
    assert listed[0].is_default is True


# --- default prompts --------------------------------------------------------


async def test_default_prompts_are_synced_once_and_read_only(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    service = create_prompt_service(db_ctx)

    await service.sync_default_prompts()
    await service.sync_default_prompts()

    defaults = [p for p in await service.list_prompts(owner.uuid) if p.is_default]
    assert len(defaults) == len(DEFAULT_PROMPTS)
    assert all(p.latest_version.version == 1 for p in defaults)
    with pytest.raises(PromptReadOnlyError):
        await service.add_version(defaults[0].uuid, owner.uuid, _version())
    with pytest.raises(PromptReadOnlyError):
        await service.archive_prompt(defaults[0].uuid, owner.uuid)


async def test_a_changed_default_prompt_gets_a_new_version(
    db_ctx: DBContext, monkeypatch
):
    service = create_prompt_service(db_ctx)
    await service.sync_default_prompts()

    first = DEFAULT_PROMPTS[0]
    changed = DefaultPrompt(
        **{**first.__dict__, "user_prompt": first.user_prompt + "\nBe brief."}
    )
    monkeypatch.setattr(
        "src.services.prompt_service.DEFAULT_PROMPTS",
        [changed, *DEFAULT_PROMPTS[1:]],
    )
    await service.sync_default_prompts()

    resolved = await service.default_prompt(
        first.prompting_type, first.screening_target
    )
    assert resolved.version == 2
    assert resolved.user_prompt.endswith("Be brief.")


# --- resolving a job's prompt -----------------------------------------------


async def test_a_job_without_a_choice_gets_the_latest_default(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    service = create_prompt_service(db_ctx)
    await service.sync_default_prompts()

    resolved = await service.resolve(owner.uuid, ZERO, PAPER, None)

    assert resolved.version == 1
    assert resolved.version_uuid is not None
    assert resolved.prompt_name == "Papers: zero-shot"


async def test_a_job_can_pin_its_owners_prompt_version(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    service = create_prompt_service(db_ctx)
    created = await service.create_prompt(owner.uuid, _create())
    v1 = created.latest_version.uuid
    await service.add_version(created.uuid, owner.uuid, _version(USER_PROMPT + "!"))

    resolved = await service.resolve(owner.uuid, ZERO, PAPER, v1)

    # The version asked for, not the newest one.
    assert resolved.version == 1
    assert resolved.user_prompt == USER_PROMPT
    assert resolved.system_prompt == "Be careful."


@pytest.mark.parametrize(
    "prompting_type, target, error",
    [
        (JobPromptingType.PER_CRITERIA, PAPER, "PER_CRITERIA"),
        (ZERO, ScreeningTarget.GITHUB_REPOSITORY, "GITHUB_REPOSITORY"),
    ],
)
async def test_a_job_cannot_use_a_prompt_written_for_another_type_or_target(
    db_ctx: DBContext, factory: Factory, prompting_type, target, error
):
    owner = await factory.user()
    service = create_prompt_service(db_ctx)
    created = await service.create_prompt(owner.uuid, _create())

    with pytest.raises(ValueError, match=error):
        await service.resolve(
            owner.uuid, prompting_type, target, created.latest_version.uuid
        )


async def test_a_job_cannot_use_another_users_or_a_deleted_prompt(
    db_ctx: DBContext, factory: Factory
):
    alice = await factory.user()
    bob = await factory.user()
    service = create_prompt_service(db_ctx)
    created = await service.create_prompt(alice.uuid, _create())
    version = created.latest_version.uuid

    with pytest.raises(PromptNotFoundError):
        await service.resolve(bob.uuid, ZERO, PAPER, version)
    with pytest.raises(PromptNotFoundError):
        await service.resolve(alice.uuid, ZERO, PAPER, uuid4())

    await service.archive_prompt(created.uuid, alice.uuid)
    with pytest.raises(ValueError, match="deleted"):
        await service.resolve(alice.uuid, ZERO, PAPER, version)
    # ...but a job that already pinned it still runs with it.
    resolved = await service.resolve(alice.uuid, ZERO, PAPER, version, new_job=False)
    assert resolved.user_prompt == USER_PROMPT


async def test_an_unsynced_default_falls_back_to_the_code(
    db_ctx: DBContext, factory: Factory, monkeypatch
):
    owner = await factory.user()
    service = create_prompt_service(db_ctx)
    monkeypatch.setattr(
        service.prompt_crud, "fetch_default_prompt", AsyncMock(return_value=None)
    )

    resolved = await service.resolve(
        owner.uuid, JobPromptingType.PER_CRITERIA, PAPER, None, new_job=False
    )

    assert resolved.version is None
    assert "{{criterion}}" in resolved.user_prompt


# --- job creation -----------------------------------------------------------


async def test_a_created_job_stores_its_prompt_and_parallelism(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)
    prompt_service = create_prompt_service(db_ctx)
    created = await prompt_service.create_prompt(
        owner.uuid,
        _create(
            prompting_type=JobPromptingType.PER_CRITERIA,
            user_prompt="{{title}} {{abstract}} {{criterion}}",
        ),
    )
    jobtask_service = MagicMock()
    jobtask_service.bulk_create = AsyncMock()
    jobtask_service.start_job_tasks = AsyncMock(return_value=MagicMock(id=str(uuid4())))
    service = JobService(jobtask_service, db_ctx.crud(JobCrud), prompt_service)

    job = await service.create(
        JobCreate(
            project_uuid=project.uuid,
            owner_uuid=owner.uuid,
            llm_config=LLMModelConfig(
                provider_name="mock",
                model_name="m",
                provider_parameters={},
                model_parameters={},
            ),
            prompting_config=PerCriteriaPromptingConfig(
                prompt_version_uuid=created.latest_version.uuid
            ),
            max_parallel_calls=3,
        )
    )

    assert job.max_parallel_calls == 3
    assert job.prompting_config.prompt_version_uuid == created.latest_version.uuid
    assert job.prompting_config.prompt_ref is not None
    assert job.prompting_config.prompt_ref.name == "Mine"
    assert job.prompting_config.prompt_ref.version == 1
    stored = await service.fetch_by_uuid(job.uuid, owner.uuid)
    assert stored.max_parallel_calls == 3
    assert stored.prompting_config.prompt_version_uuid == created.latest_version.uuid
    # The celery task gets the pinned version too.
    sent = jobtask_service.start_job_tasks.await_args.args[1]
    assert sent["prompting_config"]["prompt_version_uuid"] == (
        created.latest_version.uuid
    )
    assert sent["max_parallel_calls"] == 3
