from uuid import UUID
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.session import get_db
from src.schemas.project import ProjectCreate, ProjectRead
from src.crud.project_crud import ProjectCrud

class ProjectService:
    def __init__(self, db: AsyncSession, project_crud: ProjectCrud):
        self.db = db
        self.project_crud = project_crud

    async def fetch_all(self) -> list[ProjectRead]:
        rows = await self.project_crud.fetch_projects()
        return [ProjectRead(**row) for row in rows]

    async def fetch_by_uuid(self, uuid: UUID) -> ProjectRead | None:
        row = await self.project_crud.fetch_project_by_uuid(uuid)
        return None if row is None else ProjectRead.model_validate(row)

    async def create(self, data: ProjectCreate) -> ProjectRead:
        return await self.project_crud.create_project(data)

    async def delete(self, uuid: UUID) -> bool:
        return await self.project_crud.delete_project(uuid)

def get_project_service(db: AsyncSession = Depends(get_db)) -> ProjectService:
    return ProjectService(db, ProjectCrud(db))
