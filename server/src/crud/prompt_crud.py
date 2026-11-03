from typing import Optional, Sequence
from uuid import UUID

from sqlalchemy import func, or_, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.prompt import Prompt, PromptVersion

# pg_advisory_xact_lock key of the default prompt sync; any constant works as
# long as nothing else uses it.
DEFAULT_PROMPT_SYNC_LOCK = 162_001


def _visible_to(owner_uuid: UUID):
    """The built-in prompts and the owner's own ones."""
    return or_(Prompt.owner_uuid == owner_uuid, Prompt.owner_uuid.is_(None))


class PromptCrud:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def fetch_prompts_with_latest_version(
        self,
        owner_uuid: UUID,
        prompting_type: Optional[str] = None,
        screening_target: Optional[str] = None,
    ) -> Sequence[tuple[Prompt, PromptVersion]]:
        """Visible, unarchived prompts: the built-in ones first, then by name."""
        latest = (
            select(
                PromptVersion.prompt_id,
                func.max(PromptVersion.version).label("version"),
            )
            .group_by(PromptVersion.prompt_id)
            .subquery()
        )
        stmt = (
            select(Prompt, PromptVersion)
            .join(latest, latest.c.prompt_id == Prompt.id)
            .join(
                PromptVersion,
                (PromptVersion.prompt_id == Prompt.id)
                & (PromptVersion.version == latest.c.version),
            )
            .where(_visible_to(owner_uuid), Prompt.archived_at.is_(None))
            .order_by(Prompt.owner_uuid.is_not(None), Prompt.name, Prompt.id)
        )
        if prompting_type is not None:
            stmt = stmt.where(Prompt.prompting_type == prompting_type)
        if screening_target is not None:
            stmt = stmt.where(Prompt.screening_target == screening_target)
        result = await self.db.execute(stmt)
        return [(row[0], row[1]) for row in result.all()]

    async def fetch_prompt(self, uuid: UUID, owner_uuid: UUID) -> Optional[Prompt]:
        """A visible prompt, archived or not."""
        stmt = select(Prompt).where(Prompt.uuid == uuid, _visible_to(owner_uuid))
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def fetch_default_prompt(self, slug: str) -> Optional[Prompt]:
        stmt = select(Prompt).where(Prompt.slug == slug, Prompt.owner_uuid.is_(None))
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def fetch_versions(self, prompt_id: int) -> Sequence[PromptVersion]:
        """Newest first."""
        stmt = (
            select(PromptVersion)
            .where(PromptVersion.prompt_id == prompt_id)
            .order_by(PromptVersion.version.desc())
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def fetch_latest_version(self, prompt_id: int) -> Optional[PromptVersion]:
        stmt = (
            select(PromptVersion)
            .where(PromptVersion.prompt_id == prompt_id)
            .order_by(PromptVersion.version.desc())
            .limit(1)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def fetch_version_with_prompt(
        self, version_uuid: UUID, owner_uuid: UUID
    ) -> Optional[tuple[Prompt, PromptVersion]]:
        """A version of a visible prompt, archived or not."""
        stmt = (
            select(Prompt, PromptVersion)
            .join(PromptVersion, PromptVersion.prompt_id == Prompt.id)
            .where(PromptVersion.uuid == version_uuid, _visible_to(owner_uuid))
        )
        result = await self.db.execute(stmt)
        row = result.one_or_none()
        return (row[0], row[1]) if row else None

    async def create_prompt(
        self,
        *,
        owner_uuid: Optional[UUID],
        name: str,
        description: Optional[str],
        prompting_type: str,
        screening_target: str,
        slug: Optional[str] = None,
    ) -> Prompt:
        prompt = Prompt(
            owner_uuid=owner_uuid,
            slug=slug,
            name=name,
            description=description,
            prompting_type=prompting_type,
            screening_target=screening_target,
        )
        self.db.add(prompt)
        await self.db.flush()
        await self.db.refresh(prompt)
        return prompt

    async def add_version(
        self,
        prompt: Prompt,
        *,
        system_prompt: str,
        user_prompt: str,
        change_note: Optional[str] = None,
    ) -> PromptVersion:
        """Appends the next version and touches the prompt's updated_at."""
        latest = await self.fetch_latest_version(prompt.id)
        version = PromptVersion(
            prompt_id=prompt.id,
            version=(latest.version + 1) if latest else 1,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            change_note=change_note,
        )
        self.db.add(version)
        await self.db.execute(
            update(Prompt).where(Prompt.id == prompt.id).values(updated_at=func.now())
        )
        await self.db.flush()
        await self.db.refresh(version)
        await self.db.refresh(prompt)
        return version

    async def update_prompt(self, prompt: Prompt, **values) -> Prompt:
        await self.db.execute(
            update(Prompt).where(Prompt.id == prompt.id).values(**values)
        )
        await self.db.flush()
        await self.db.refresh(prompt)
        return prompt

    async def archive_prompt(self, prompt: Prompt) -> None:
        await self.update_prompt(prompt, archived_at=func.now())

    async def lock_default_prompt_sync(self) -> None:
        """Held until the transaction ends, so API workers sync one at a time."""
        await self.db.execute(
            text("SELECT pg_advisory_xact_lock(:key)"),
            {"key": DEFAULT_PROMPT_SYNC_LOCK},
        )
