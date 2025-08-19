from uuid import UUID
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.schemas.paper import PaperCreate
from src.models.paper import Paper

class PaperCrud:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def bulk_create_papers(self, papers: List[PaperCreate]):
        db_objs = [Paper(**paper.model_dump()) for paper in papers]
        self.db.add_all(db_objs)
        await self.db.commit()
        await self.db.flush()
        return db_objs

    async def fetch_papers_by_project_uuid(self, project_uuid: UUID) -> List[Paper]:
        stmt = (
            select(Paper)
            .where(Paper.project_uuid == project_uuid)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()
