import logging
from typing import Optional
from uuid import UUID

from sqlalchemy import func

from src.core.prompt_template import (
    ALLOWED_VARIABLES,
    NEEDS_CRITERIA,
    PROMPT_TYPES,
    REQUIRED_VARIABLES,
    VARIABLES,
    validate_template,
)
from src.core.prompts import DEFAULT_PROMPTS, default_prompt_for
from src.crud.prompt_crud import PromptCrud
from src.db.db_context import DBContext
from src.db.models.prompt import Prompt, PromptVersion
from src.schemas.job import JobPromptingType
from src.schemas.project import ScreeningTarget
from src.schemas.prompt import (
    PromptCreateRequest,
    PromptDetail,
    PromptRead,
    PromptText,
    PromptTypeVariables,
    PromptVariableRead,
    PromptVariablesResponse,
    PromptVersionRead,
    ResolvedPrompt,
)

logger = logging.getLogger(__name__)


class PromptNotFoundError(ValueError):
    pass


class PromptReadOnlyError(ValueError):
    """Built-in and archived prompts can't be changed."""


def _read(prompt: Prompt, latest: PromptVersion) -> PromptRead:
    return PromptRead(
        uuid=prompt.uuid,
        name=prompt.name,
        description=prompt.description,
        prompting_type=JobPromptingType(prompt.prompting_type),
        screening_target=ScreeningTarget(prompt.screening_target),
        is_default=prompt.owner_uuid is None,
        archived=prompt.archived_at is not None,
        created_at=prompt.created_at,
        updated_at=prompt.updated_at,
        latest_version=PromptVersionRead.model_validate(latest),
    )


def _resolved(prompt: Prompt, version: PromptVersion) -> ResolvedPrompt:
    return ResolvedPrompt(
        prompt_uuid=prompt.uuid,
        prompt_name=prompt.name,
        version_uuid=version.uuid,
        version=version.version,
        system_prompt=version.system_prompt,
        user_prompt=version.user_prompt,
    )


def prompt_variables() -> PromptVariablesResponse:
    return PromptVariablesResponse(
        variables=[
            PromptVariableRead(name=v.name, label=v.label, description=v.description)
            for v in VARIABLES.values()
        ],
        types=[
            PromptTypeVariables(
                prompting_type=t,
                allowed=[name for name in VARIABLES if name in ALLOWED_VARIABLES[t]],
                required=[name for name in VARIABLES if name in REQUIRED_VARIABLES[t]],
                requires_criteria=t in NEEDS_CRITERIA,
            )
            for t in PROMPT_TYPES
        ],
    )


def _check_template(prompting_type: JobPromptingType, text: PromptText) -> None:
    errors = validate_template(prompting_type, text.system_prompt, text.user_prompt)
    if errors:
        raise ValueError("; ".join(errors))


class PromptService:
    def __init__(self, prompt_crud: PromptCrud):
        self.prompt_crud = prompt_crud

    async def list_prompts(
        self,
        owner_uuid: UUID,
        prompting_type: Optional[JobPromptingType] = None,
        screening_target: Optional[ScreeningTarget] = None,
    ) -> list[PromptRead]:
        rows = await self.prompt_crud.fetch_prompts_with_latest_version(
            owner_uuid,
            prompting_type.value if prompting_type else None,
            screening_target.value if screening_target else None,
        )
        return [_read(prompt, latest) for prompt, latest in rows]

    async def get_prompt(self, uuid: UUID, owner_uuid: UUID) -> PromptDetail:
        prompt = await self._visible_prompt(uuid, owner_uuid)
        return await self._detail(prompt)

    async def create_prompt(
        self, owner_uuid: UUID, data: PromptCreateRequest
    ) -> PromptDetail:
        _check_template(data.prompting_type, data)
        prompt = await self.prompt_crud.create_prompt(
            owner_uuid=owner_uuid,
            name=data.name,
            description=data.description,
            prompting_type=data.prompting_type.value,
            screening_target=data.screening_target.value,
        )
        await self._add_version_if_changed(prompt, data)
        return await self._detail(prompt)

    async def add_version(
        self, uuid: UUID, owner_uuid: UUID, data: PromptText
    ) -> PromptDetail:
        """Saves the text as the next version; saving an unchanged text is a no-op."""
        prompt = await self._own_prompt(uuid, owner_uuid)
        _check_template(JobPromptingType(prompt.prompting_type), data)
        await self._add_version_if_changed(prompt, data)
        return await self._detail(prompt)

    async def archive_prompt(self, uuid: UUID, owner_uuid: UUID) -> None:
        prompt = await self._own_prompt(uuid, owner_uuid)
        await self.prompt_crud.update_prompt(prompt, archived_at=func.now())

    async def resolve(
        self,
        owner_uuid: UUID,
        prompting_type: JobPromptingType,
        screening_target: ScreeningTarget,
        version_uuid: Optional[UUID],
        *,
        new_job: bool = True,
    ) -> ResolvedPrompt:
        """
        The version a job runs with: the given one, or the latest version of the
        matching built-in prompt (also for jobs created before prompts were
        stored). A new job may only pin a live prompt of its type and target; a
        running job keeps its version even if the prompt was deleted since.
        """
        if version_uuid is None:
            return await self.default_prompt(prompting_type, screening_target)

        row = await self.prompt_crud.fetch_version_with_prompt(version_uuid, owner_uuid)
        if row is None:
            raise PromptNotFoundError(f"Prompt version {version_uuid} not found")
        prompt, version = row
        if not new_job:
            return _resolved(prompt, version)
        if prompt.archived_at is not None:
            raise ValueError(f"Prompt '{prompt.name}' has been deleted")
        if prompt.prompting_type != prompting_type.value:
            raise ValueError(
                f"Prompt '{prompt.name}' is written for {prompt.prompting_type} "
                f"prompting, not {prompting_type.value}"
            )
        if prompt.screening_target != screening_target.value:
            raise ValueError(
                f"Prompt '{prompt.name}' is written for {prompt.screening_target} "
                f"screening, not {screening_target.value}"
            )
        return _resolved(prompt, version)

    async def default_prompt(
        self, prompting_type: JobPromptingType, screening_target: ScreeningTarget
    ) -> ResolvedPrompt:
        """The latest version of a built-in prompt, or its text in the code if unsynced."""
        default = default_prompt_for(prompting_type, screening_target)
        prompt = await self.prompt_crud.fetch_default_prompt(default.slug)
        version = (
            await self.prompt_crud.fetch_latest_version(prompt.id) if prompt else None
        )
        if prompt is None or version is None:
            return ResolvedPrompt(
                prompt_name=default.name,
                system_prompt=default.system_prompt,
                user_prompt=default.user_prompt,
            )
        return _resolved(prompt, version)

    async def sync_default_prompts(self) -> None:
        """Creates missing built-in prompts and versions changed ones. Idempotent."""
        await self.prompt_crud.lock_default_prompt_sync()
        for default in DEFAULT_PROMPTS:
            prompt = await self.prompt_crud.fetch_default_prompt(default.slug)
            change_note = "Updated in a new release" if prompt else None
            if prompt is None:
                prompt = await self.prompt_crud.create_prompt(
                    owner_uuid=None,
                    slug=default.slug,
                    name=default.name,
                    description=default.description,
                    prompting_type=default.prompting_type.value,
                    screening_target=default.screening_target.value,
                )
                logger.info("Created default prompt %s", default.slug)
            version = await self._add_version_if_changed(
                prompt,
                PromptText.model_construct(
                    system_prompt=default.system_prompt,
                    user_prompt=default.user_prompt,
                    change_note=change_note,
                ),
            )
            if version is not None:
                logger.info(
                    "Default prompt %s is now version %s", default.slug, version.version
                )

    async def _visible_prompt(self, uuid: UUID, owner_uuid: UUID) -> Prompt:
        prompt = await self.prompt_crud.fetch_prompt(uuid, owner_uuid)
        if prompt is None:
            raise PromptNotFoundError("Prompt not found")
        return prompt

    async def _own_prompt(self, uuid: UUID, owner_uuid: UUID) -> Prompt:
        prompt = await self._visible_prompt(uuid, owner_uuid)
        if prompt.owner_uuid is None:
            raise PromptReadOnlyError("Built-in prompts can't be changed")
        if prompt.archived_at is not None:
            raise PromptReadOnlyError("Deleted prompts can't be changed")
        return prompt

    async def _add_version_if_changed(
        self, prompt: Prompt, text: PromptText
    ) -> Optional[PromptVersion]:
        latest = await self.prompt_crud.fetch_latest_version(prompt.id)
        if latest and (latest.system_prompt, latest.user_prompt) == (
            text.system_prompt,
            text.user_prompt,
        ):
            return None
        return await self.prompt_crud.add_version(
            prompt,
            system_prompt=text.system_prompt,
            user_prompt=text.user_prompt,
            change_note=text.change_note,
        )

    async def _detail(self, prompt: Prompt) -> PromptDetail:
        versions = await self.prompt_crud.fetch_versions(prompt.id)
        read = _read(prompt, versions[0])
        return PromptDetail(
            **read.model_dump(),
            versions=[PromptVersionRead.model_validate(v) for v in versions],
        )


def create_prompt_service(db_ctx: DBContext) -> PromptService:
    return PromptService(db_ctx.crud(PromptCrud))
