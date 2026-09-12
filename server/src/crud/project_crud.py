from typing import Optional, Sequence, Tuple
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.project import Project
from src.schemas.project import ProjectCreate, ProjectPreferences, ProjectRead


class ProjectCrud:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def fetch_projects(self, owner_uuid: UUID) -> Sequence[ProjectRead]:
        stmt = select(
            Project.uuid,
            Project.name,
            Project.criteria,
            Project.preferences,
            Project.created_at,
            Project.updated_at,
            Project.screening_target,
        ).where(Project.owner_uuid == owner_uuid)
        result = await self.db.execute(stmt)
        # TODO: Fix
        return result.mappings().all()  # type: ignore

    async def get_project_preferences(
        self, uuid: UUID, owner_uuid: UUID
    ) -> Optional[ProjectPreferences]:
        stmt = (
            select(Project.preferences)
            .where(Project.uuid == uuid)
            .where(Project.owner_uuid == owner_uuid)
        )
        result = await self.db.execute(stmt)
        row = result.mappings().one_or_none()
        if row is None:
            return None
        data = row["preferences"]
        if data is None:
            return None
        return ProjectPreferences(**data)

    async def update_project_preferences(
        self, uuid: UUID, owner_uuid: UUID, preferences: ProjectPreferences
    ) -> bool:
        stmt = (
            update(Project)
            .where(Project.uuid == uuid)
            .where(Project.owner_uuid == owner_uuid)
            .values(preferences=preferences.model_dump())
        )
        result = await self.db.execute(stmt)
        return result.rowcount > 0

    async def fetch_project_by_uuid(
        self, uuid: UUID, owner_uuid: UUID
    ) -> ProjectRead | None:
        stmt = (
            select(Project)
            .where(Project.uuid == uuid)
            .where(Project.owner_uuid == owner_uuid)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def set_criteria_embeddings(
        self,
        uuid: UUID,
        owner_uuid: UUID,
        inclusion_criteria_embedding: list[float],
        exclusion_criteria_embedding: list[float],
    ) -> bool:
        stmt = (
            update(Project)
            .where(Project.uuid == uuid)
            .where(Project.owner_uuid == owner_uuid)
            .values(
                inclusion_criteria_embedding=inclusion_criteria_embedding,
                exclusion_criteria_embedding=exclusion_criteria_embedding,
            )
        )
        result = await self.db.execute(stmt)
        return result.rowcount > 0

    async def create_project(self, project_data: ProjectCreate) -> Tuple[int, UUID]:
        new_project = Project(**project_data.model_dump())
        self.db.add(new_project)
        await self.db.flush()
        return new_project.id, new_project.uuid

    async def delete_project(self, uuid: UUID, owner_uuid: UUID) -> bool:
        stmt = (
            select(Project)
            .where(Project.uuid == uuid)
            .where(Project.owner_uuid == owner_uuid)
        )
        result = await self.db.execute(stmt)
        project = result.scalar_one_or_none()

        if project:
            await self.db.delete(project)
            return True
        return False
