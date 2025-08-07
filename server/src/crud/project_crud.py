from typing import List, Tuple
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.models.project import Project
from src.schemas.project import ProjectCreate, ProjectRead

class ProjectCrud:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def fetch_projects(self) -> List[ProjectRead]:
        stmt = select(
            Project.uuid,
            Project.name,
            Project.criteria,
            Project.created_at,
            Project.updated_at
        )
        result = await self.db.execute(stmt)
        return result.mappings().all()

    async def fetch_project_by_uuid(self, uuid: UUID) -> ProjectRead:
        stmt = select(Project).where(Project.uuid == uuid)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create_project(self, project_data: ProjectCreate) -> Tuple[int, UUID]:
        new_project = Project(**project_data.model_dump(exclude_none=True))
        self.db.add(new_project)
        await self.db.commit()
        await self.db.refresh(new_project)
        return new_project.id, new_project.uuid

    async def delete_project(self, uuid: UUID) -> bool:
        stmt = select(Project).where(Project.uuid == uuid)
        result = await self.db.execute(stmt)
        project = result.scalar_one_or_none()
        
        if project:
            await self.db.delete(project)
            await self.db.commit()
            return True
        return False
