from typing import List, Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import cast, func
from sqlalchemy.sql.sqltypes import Float

from src.db.models.file import File
from src.db.models.jobtask import JobTask
from src.db.models.paper import Paper
from src.db.models.project import Project
from src.schemas.job import JobScreeningMode
from src.schemas.paper import PaperCreate, PaperHumanResult, PaperReadWithAvgProbability


class PaperCrud:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def bulk_create_papers(self, papers: List[PaperCreate]):
        db_objs = [Paper(**paper.model_dump()) for paper in papers]
        self.db.add_all(db_objs)
        await self.db.flush()
        return db_objs
    
    async def fetch_paper_by_uuid(self, uuid: UUID, owner_uuid: UUID) -> Paper | None:
        stmt = (
            select(Paper)
            .join(Project, Project.uuid == Paper.project_uuid)
            .where(Paper.uuid == uuid)
            .where(Project.owner_uuid == owner_uuid)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()


    async def fetch_papers_by_project_uuid(self, project_uuid: UUID, owner_uuid: UUID) -> Sequence[Paper]:
        stmt = (
            select(Paper)
            .join(Project, Project.uuid == Paper.project_uuid)
            .where(Paper.project_uuid == project_uuid)
            .where(Project.owner_uuid == owner_uuid)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def fetch_papers_by_paper_uuids(
        self, paper_uuids: List[str], owner_uuid: UUID
    ) -> Sequence[Paper]:
        stmt = (
            select(Paper)
            .join(Project, Project.uuid == Paper.project_uuid)
            .where(Paper.uuid.in_(paper_uuids))
            .where(Project.owner_uuid == owner_uuid)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def fetch_papers_with_model_evals_by_project_uuid(
        self, project_uuid: UUID, owner_uuid: UUID
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
            select(Paper, avg_prob, error_messages, File.filename.label("pdf_filename"))
            .join(Project, Project.uuid == Paper.project_uuid)
            .outerjoin(JobTask, JobTask.paper_uuid == Paper.uuid)
            .outerjoin(File, File.uuid == Paper.pdf_file_uuid)
            .where(Paper.project_uuid == project_uuid)
            .where(Project.owner_uuid == owner_uuid)
            .group_by(Paper.id, File.filename)
        )
        result = await self.db.execute(stmt)
        # TODO: Fix
        return result.mappings().all()  # type: ignore

    async def add_paper_human_result(
        self, paper_uuid: UUID, owner_uuid: UUID, human_result: PaperHumanResult
    ):
        stmt = (
            select(Paper)
            .join(Project, Project.uuid == Paper.project_uuid)
            .where(Paper.uuid == paper_uuid)
            .where(Project.owner_uuid == owner_uuid)
        )
        result = await self.db.execute(stmt)
        paper = result.scalar_one_or_none()
        if paper:
            paper.human_result = human_result
            await self.db.flush()

    async def count_papers_with_human_results(self, project_uuid: UUID, owner_uuid: UUID) -> int:
        stmt = (
            select(func.count())
            .select_from(Paper)
            .join(Project, Project.uuid == Paper.project_uuid)
            .where(Paper.project_uuid == project_uuid, Paper.human_result.isnot(None))
            .where(Project.owner_uuid == owner_uuid)
        )
        count = await self.db.execute(stmt)
        return count.scalar()

    async def fetch_max_paper_id(self, project_uuid: UUID, owner_uuid: UUID) -> int:
        stmt = (
            select(func.coalesce(func.max(Paper.paper_id), 0))
            .select_from(Paper)
            .join(Project, Project.uuid == Paper.project_uuid)
            .where(Paper.project_uuid == project_uuid)
            .where(Project.owner_uuid == owner_uuid)
        )
        result = await self.db.execute(stmt)
        return result.scalar()

    async def fetch_papers_for_screening(
        self, project_uuid: UUID, owner_uuid: UUID, screening_mode: JobScreeningMode
    ) -> Sequence[Paper]:
        source_column = (
            Paper.file_uuid if screening_mode == JobScreeningMode.TEXT else Paper.pdf_file_uuid
        )
        stmt = (
            select(Paper)
            .join(Project, Project.uuid == Paper.project_uuid)
            .where(Paper.project_uuid == project_uuid)
            .where(Project.owner_uuid == owner_uuid)
            .where(source_column.isnot(None))
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def set_paper_pdf_file_uuid(
        self, paper_uuid: UUID, owner_uuid: UUID, pdf_file_uuid: UUID
    ) -> Paper | None:
        stmt = (
            select(Paper)
            .join(Project, Project.uuid == Paper.project_uuid)
            .where(Paper.uuid == paper_uuid)
            .where(Project.owner_uuid == owner_uuid)
        )
        result = await self.db.execute(stmt)
        paper = result.scalar_one_or_none()
        if paper:
            paper.pdf_file_uuid = pdf_file_uuid
            await self.db.flush()
            await self.db.refresh(paper)
        return paper
    
    async def fetch_papers_missing_pdf(
        self, project_uuid: UUID, owner_uuid: UUID
    ) -> Sequence[Paper]:
        stmt = (
            select(Paper)
            .join(Project, Project.uuid == Paper.project_uuid)
            .where(Paper.project_uuid == project_uuid)
            .where(Project.owner_uuid == owner_uuid)
            .where(Paper.pdf_file_uuid.is_(None))
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()
