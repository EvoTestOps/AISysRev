from uuid import UUID
from src.crud.paper_crud import PaperCrud
from src.celery.tasks import process_job_task
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.session import get_db
from src.schemas.paper import (
    PaperCreate,
    PaperHumanResult,
    PaperRead,
    PaperReadWithAvgProbability,
)
import logging

logger = logging.getLogger(__name__)


class PaperService:
    def __init__(self, db: AsyncSession, paper_crud: PaperCrud):
        self.db = db
        self.paper_crud = paper_crud

    async def fetch_papers(self, project_uuid: UUID):
        papers = await self.paper_crud.fetch_papers_by_project_uuid(project_uuid)
        return [PaperRead.model_validate(paper) for paper in papers]

    async def fetch_papers_with_model_evals(self, project_uuid: UUID):
        rows = await self.paper_crud.fetch_papers_with_model_evals_by_project_uuid(
            project_uuid
        )
        return [
            PaperReadWithAvgProbability(
                **paper.__dict__,  # or unpack via your ORM->schema adapter
                avg_probability_decision=row["avg_probability_decision"],
            )
            for row in rows
            for paper in [row["Paper"]]
        ]

    async def bulk_create(self, project_uuid: UUID, papers: list[dict], start_index=1):
        created_papers = [
            PaperCreate(
                paper_id=idx,
                project_uuid=project_uuid,
                file_uuid=paper["file_uuid"],
                doi=paper["doi"],
                title=paper["title"],
                abstract=paper["abstract"],
            )
            for idx, paper in enumerate(papers, start=start_index)
        ]

        return await self.paper_crud.bulk_create_papers(created_papers)

    async def start_job_tasks(self, job_id: int, job_data: dict):
        # job_data is of type JobCreate
        logger.info("start_job_tasks: Processing job %s", job_id)
        return process_job_task.delay(job_id, job_data)

    async def add_human_result(self, uuid: UUID, human_result: PaperHumanResult):
        await self.paper_crud.add_paper_human_result(uuid, human_result)


def get_paper_service(db: AsyncSession = Depends(get_db)) -> PaperService:
    paper_crud = PaperCrud(db)
    return PaperService(db, paper_crud)
