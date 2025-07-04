from uuid import UUID
from fastapi import Depends
from src.db.session import get_db
from src.crud import project_crud
from src.schemas.project import ProjectCreate, ProjectRead
from sqlalchemy.ext.asyncio import AsyncSession

class ProjectService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def fetch_all(self) -> list[ProjectRead]:
        rows = await project_crud.fetch_projects(self.db)
        return [ProjectRead(**row) for row in rows]

    async def fetch_by_uuid(self, uuid: UUID) -> ProjectRead | None:
        row = await project_crud.fetch_project_by_uuid(self.db, uuid)
        return None if row is None else ProjectRead.model_validate(row)

    async def create(self, data: ProjectCreate) -> ProjectRead:
        return await project_crud.create_project(self.db, data)
    
    async def delete(self, uuid: UUID) -> bool:
        return await project_crud.delete_project(self.db, uuid)
    
def get_project_service(db: AsyncSession = Depends(get_db)) -> ProjectService:
    return ProjectService(db)
