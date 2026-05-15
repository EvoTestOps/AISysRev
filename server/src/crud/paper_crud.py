from typing import List, Sequence
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import cast, func
from sqlalchemy.sql.sqltypes import Float

from src.db.models.jobtask import JobTask
from src.db.models.paper import Paper
from src.schemas.paper import PaperCreate, PaperHumanResult, PaperReadWithAvgProbability


class PaperCrud:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def bulk_create_papers(self, papers: List[PaperCreate]):
        db_objs = [Paper(**paper.model_dump()) for paper in papers]
        self.db.add_all(db_objs)
        await self.db.flush()
        return db_objs

    async def fetch_papers_by_project_uuid(self, project_uuid: UUID) -> Sequence[Paper]:
        stmt = select(Paper).where(Paper.project_uuid == project_uuid)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def fetch_papers_by_paper_uuids(
        self, paper_uuids: List[str]
    ) -> Sequence[Paper]:
        stmt = select(Paper).where(Paper.uuid.in_(paper_uuids))
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def fetch_papers_with_model_evals_by_project_uuid(
        self, project_uuid: UUID
    ) -> List[PaperReadWithAvgProbability]:
        avg_prob = func.avg(
            cast(
                JobTask.result["overall_decision"]["probability_decision"].astext,
                Float,
            )
        ).label("avg_probability_decision")
        error_messages = (
            func.array_agg(JobTask.error)
            .filter(JobTask.error.isnot(None))
            .label("error_messages")
        )
        stmt = (
            select(Paper, avg_prob, error_messages)
            .outerjoin(JobTask, JobTask.paper_uuid == Paper.uuid)
            .where(Paper.project_uuid == project_uuid)
            .group_by(Paper.id)
        )
        result = await self.db.execute(stmt)
        # TODO: Fix
        return result.mappings().all()  # type: ignore

    async def add_paper_human_result(
        self, paper_uuid: UUID, human_result: PaperHumanResult
    ):
        stmt = (
            update(Paper)
            .where(Paper.uuid == paper_uuid)
            .values(human_result=human_result)
        )
        await self.db.execute(stmt)
        await self.db.flush()

    async def count_papers_with_human_results(self, project_uuid: UUID):
        stmt = (
            select(func.count())
            .select_from(Paper)
            .where(Paper.project_uuid == project_uuid, Paper.human_result.isnot(None))
        )
        count = await self.db.execute(stmt)
        return count.scalar()


