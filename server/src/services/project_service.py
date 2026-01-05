from uuid import UUID
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.session import get_db
from src.schemas.project import ProjectCreate, ProjectPreferences, ProjectRead
from src.crud.project_crud import ProjectCrud
from src.db.db_context import DBContext, get_db_ctx


class ProjectService:
    def __init__(self, project_crud: ProjectCrud):
        self.project_crud = project_crud

    async def fetch_all(self) -> list[ProjectRead]:
        rows = await self.project_crud.fetch_projects()
        return [ProjectRead(**row) for row in rows]

    async def update_project_preferences(
        self, uuid: UUID, preferences: ProjectPreferences
    ):
        # 1. Get existing settings
        # 2. Copy new values
        prefs = await self.project_crud.get_project_preferences(uuid)
        if prefs is None:
            # In case no preferences, create new
            await self.project_crud.update_project_preferences(uuid, preferences)
            return True
        else:
            # If prefs exist, apply over old
            merged = prefs.model_copy(update=preferences.model_dump(exclude_unset=True))
            await self.project_crud.update_project_preferences(uuid, merged)
            return True

    async def fetch_by_uuid(self, uuid: UUID) -> ProjectRead | None:
        row = await self.project_crud.fetch_project_by_uuid(uuid)
        return None if row is None else ProjectRead.model_validate(row)

    async def create(self, data: ProjectCreate) -> ProjectRead:
        return await self.project_crud.create_project(data)

    async def delete(self, uuid: UUID) -> bool:
        return await self.project_crud.delete_project(uuid)


def create_project_service(db_ctx: DBContext) -> ProjectService:
    return ProjectService(db_ctx.crud(ProjectCrud))
