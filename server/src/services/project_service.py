from uuid import UUID

from src.crud.project_crud import ProjectCrud
from src.db.db_context import DBContext
from src.schemas.project import ProjectCreate, ProjectPreferences, ProjectRead


class ProjectService:
    def __init__(self, project_crud: ProjectCrud):
        self.project_crud = project_crud

    async def fetch_all(self, owner_uuid: UUID) -> list[ProjectRead]:
        rows = await self.project_crud.fetch_projects(owner_uuid)
        return [
            ProjectRead(
                uuid=row.uuid,
                criteria=row.criteria,
                name=row.name,
                preferences=row.preferences,
                created_at=row.created_at,
                updated_at=row.updated_at,
            )
            for row in rows
        ]

    async def update_project_preferences(
        self, uuid: UUID, owner_uuid: UUID, preferences: ProjectPreferences
    ):
        # 1. Get existing settings
        # 2. Copy new values
        prefs = await self.project_crud.get_project_preferences(uuid, owner_uuid)
        if prefs is None:
            # In case no preferences, create new
            await self.project_crud.update_project_preferences(uuid, owner_uuid, preferences)
            return True
        else:
            # If prefs exist, apply over old
            merged = prefs.model_copy(update=preferences.model_dump(exclude_unset=True))
            await self.project_crud.update_project_preferences(uuid, owner_uuid, merged)
            return True

    async def fetch_by_uuid(self, uuid: UUID, owner_uuid: UUID) -> ProjectRead | None:
        row = await self.project_crud.fetch_project_by_uuid(uuid, owner_uuid)
        return None if row is None else ProjectRead.model_validate(row)

    async def create(self, data: ProjectCreate):
        return await self.project_crud.create_project(data)

    async def delete(self, uuid: UUID, owner_uuid: UUID) -> bool:
        return await self.project_crud.delete_project(uuid, owner_uuid)


def create_project_service(db_ctx: DBContext) -> ProjectService:
    return ProjectService(db_ctx.crud(ProjectCrud))
