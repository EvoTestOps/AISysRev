import logging
from typing import List
from uuid import UUID

from src.crud.paper_crud import PaperCrud
from src.db.db_context import DBContext
from src.schemas.paper import (
    PaperCreate,
    PaperHumanResult,
    PaperRead,
    PaperReadWithAvgProbability,
)

logger = logging.getLogger(__name__)


class PaperService:
    def __init__(self, paper_crud: PaperCrud):
        self.paper_crud = paper_crud

    async def fetch_papers(self, project_uuid: UUID):
        papers = await self.paper_crud.fetch_papers_by_project_uuid(project_uuid)
        return [PaperRead.model_validate(paper) for paper in papers]

    async def fetch_by_uuid(self, uuid: UUID) -> PaperRead | None:
        paper = await self.paper_crud.fetch_paper_by_uuid(uuid)
        return None if paper is None else PaperRead.model_validate(paper)

    async def fetch_papers_by_paper_uuids(self, paper_uuids: List[str]):
        papers = await self.paper_crud.fetch_papers_by_paper_uuids(paper_uuids)
        return [PaperRead.model_validate(paper) for paper in papers]

    async def fetch_papers_with_model_evals(self, project_uuid: UUID):
        rows = await self.paper_crud.fetch_papers_with_model_evals_by_project_uuid(
            project_uuid
        )
        return [
            PaperReadWithAvgProbability(
                **paper.__dict__,  # or unpack via your ORM->schema adapter
                avg_probability_decision=row["avg_probability_decision"],
                error_messages=row["error_messages"] or None,
            )
            for row in rows
            # TODO: Fix
            for paper in [row["Paper"]]  # type: ignore
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

    # async def start_job_tasks(self, job_id: int, job_data: dict):
    #     # job_data is of type JobCreate
    #     logger.info("start_job_tasks: Processing job %s", job_id)
    #     return process_job_task.delay(job_id, job_data)

    async def add_human_result(self, uuid: UUID, human_result: PaperHumanResult):
        await self.paper_crud.add_paper_human_result(uuid, human_result)

    async def count_papers_with_human_result(self, project_uuid: UUID):
        return await self.paper_crud.count_papers_with_human_results(project_uuid)


def create_paper_service(db_ctx: DBContext) -> PaperService:
    return PaperService(db_ctx.crud(PaperCrud))
