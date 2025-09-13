from uuid import UUID
from typing import List
from src.models.jobtask import JobTask
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.sql import cast, func
from sqlalchemy.sql.sqltypes import Float
from src.schemas.paper import PaperCreate, PaperHumanResult, PaperReadWithAvgProbability
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
        stmt = select(Paper).where(Paper.project_uuid == project_uuid)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def fetch_papers_with_model_evals_by_project_uuid(self, project_uuid: UUID):
        avg_prob = func.avg(
            cast(
                JobTask.result["overall_decision"]["probability_decision"].astext,
                Float,
            )
        ).label("avg_probability_decision")
        stmt = (
            select(Paper, avg_prob)
            .outerjoin(JobTask, JobTask.paper_uuid == Paper.uuid)
            .where(Paper.project_uuid == project_uuid)
            .group_by(Paper.id)
        )
        result = await self.db.execute(stmt)
        return result.mappings().all()

    async def add_paper_human_result(
        self, paper_uuid: UUID, human_result: PaperHumanResult
    ):
        stmt = (
            update(Paper)
            .where(Paper.uuid == paper_uuid)
            .values(human_result=human_result)
        )
        await self.db.execute(stmt)
        await self.db.commit()
