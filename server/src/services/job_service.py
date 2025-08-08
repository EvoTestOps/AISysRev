from uuid import UUID
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.session import get_db
from src.schemas.job import JobCreate, JobRead
from src.schemas.jobtask import JobTaskRead
from src.services.jobtask_service import JobTaskService
from src.services.file_service import FileService
from src.crud.job_crud import JobCrud
from src.crud.file_crud import FileCrud
from src.crud.jobtask_crud import JobTaskCrud
import logging

logger = logging.getLogger(__name__)


class JobService:
    def __init__(
        self,
        db: AsyncSession,
        file_service: FileService,
        jobtask_service: JobTaskService,
        job_crud: JobCrud,
    ):
        self.db = db
        self.job_crud = job_crud
        self.file_service = file_service
        self.jobtask_service = jobtask_service

    async def fetch_all(self) -> list[JobRead]:
        rows = await self.job_crud.fetch_jobs()
        return [JobRead(**row) for row in rows]

    async def fetch_by_project(self, project_uuid: UUID) -> list[JobRead]:
        rows = await self.job_crud.fetch_jobs_by_project(project_uuid)
        return [JobRead(**row) for row in rows]

    async def fetch_by_uuid(self, uuid: UUID) -> JobRead:
        job = await self.job_crud.fetch_job_by_uuid(uuid)
        return JobRead(**job)

    async def fetch_job_tasks(self, job_uuid: UUID):
        job_tasks = await self.jobtask_service.jobtask_crud.fetch_job_tasks_by_job_uuid(
            job_uuid
        )

        return [
            JobTaskRead(
                uuid=task.uuid,
                job_uuid=job_uuid,
                doi=task.doi,
                title=task.title,
                abstract=task.abstract,
                status=task.status,
                result=task.result,
                human_result=task.human_result,
                status_metadata=task.status_metadata,
            )
            for task in job_tasks
        ]

    
    async def create(self, job_data: JobCreate):
        logger.info("Begin transaction")
        async with (
            self.db.begin_nested() if self.db.in_transaction() else self.db.begin()
        ):
            logger.info("Creating new job", job_data)
            new_job = await self.job_crud.create_job(job_data)
            logger.info("Retrieving papers for project", job_data.project_uuid)
            papers = await self.file_service.fetch_papers(job_data.project_uuid)
            logger.info("Bulk-creating job tasks")
            await self.jobtask_service.bulk_create(new_job.id, papers)

        logger.info("Starting job tasks")
        await self.jobtask_service.start_job_tasks(new_job.id, job_data.model_dump())
        job_read = JobRead(
            uuid=new_job.uuid,
            project_uuid=job_data.project_uuid,
            llm_config=new_job.llm_config,
            created_at=new_job.created_at,
            updated_at=new_job.updated_at,
        )
        await self.jobtask_service.start_job_tasks(new_job.id, job_read.model_dump())

        return JobRead(
            uuid=new_job.uuid,
            project_uuid=job_data.project_uuid,
            llm_config=new_job.llm_config,
            created_at=new_job.created_at,
            updated_at=new_job.updated_at,
        )


def get_job_service(db: AsyncSession = Depends(get_db)) -> JobService:
    job_crud = JobCrud(db)
    file_crud = FileCrud(db)
    jobtask_crud = JobTaskCrud(db)

    file_service = FileService(db, file_crud)
    jobtask_service = JobTaskService(db, jobtask_crud)

    return JobService(db, file_service, jobtask_service, job_crud)
