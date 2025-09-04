from uuid import UUID
from src.services.paper_service import PaperService, get_paper_service
from src.celery.tasks import process_job_task
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.session import get_db
from src.schemas.jobtask import (
    JobTaskCreate,
    JobTaskHumanResult,
    JobTaskRead,
    JobTaskReadWithLLMConfig,
)
from src.crud.jobtask_crud import JobTaskCrud


class JobTaskService:
    def __init__(
        self, db: AsyncSession, jobtask_crud: JobTaskCrud, paper_service: PaperService
    ):
        self.db = db
        self.jobtask_crud = jobtask_crud
        self.paper_service = paper_service

    async def fetch_job_tasks(self, job_uuid: UUID):
        job_tasks = await self.jobtask_crud.fetch_job_tasks_by_job_uuid(job_uuid)

        return [
            JobTaskRead(
                uuid=task.uuid,
                job_id=task.job_id,
                doi=task.doi,
                title=task.title,
                abstract=task.abstract,
                status=task.status,
                paper_uuid=task.paper_uuid,
                result=task.result,
                human_result=task.human_result,
                status_metadata=task.status_metadata,
            )
            for task in job_tasks
        ]

    async def fetch_job_tasks_for_paper(self, paper_uuid: UUID):
        job_tasks_with_jobs = await self.jobtask_crud.fetch_job_tasks_by_paper_uuid(
            paper_uuid
        )

        return [
            JobTaskReadWithLLMConfig(
                uuid=task.uuid,
                job_id=task.job_id,
                doi=task.doi,
                title=task.title,
                abstract=task.abstract,
                paper_uuid=task.paper_uuid,
                status=task.status,
                result=task.result,
                human_result=task.human_result,
                status_metadata=task.status_metadata,
                llm_config=job.llm_config,
            )
            for task, job in job_tasks_with_jobs
        ]

    async def add_human_result(self, uuid: UUID, human_result: JobTaskHumanResult):
        await self.jobtask_crud.add_jobtask_human_result(uuid, human_result)

    async def bulk_create(self, job_id: int, project_uuid: UUID):
        papers = await self.paper_service.fetch_papers(project_uuid=project_uuid)
        if len(papers) == 0:
            raise RuntimeError("There are no papers for the given project.")
        jobtasks = [
            JobTaskCreate(
                job_id=job_id,
                doi=paper.doi,
                title=paper.title,
                abstract=paper.abstract,
                paper_uuid=paper.uuid,
            )
            for paper in papers
        ]
        return await self.jobtask_crud.bulk_create_jobtasks(jobtasks)

    async def start_job_tasks(self, job_id: int, job_data: dict):
        # job_data is of type JobCreate
        print(f"start_job_tasks: Processing job {job_id}")
        return process_job_task.delay(job_id, job_data)


def get_jobtask_service(db: AsyncSession = Depends(get_db)) -> JobTaskService:
    jobtask_crud = JobTaskCrud(db)
    paper_service = get_paper_service(db)
    return JobTaskService(db, jobtask_crud, paper_service)
