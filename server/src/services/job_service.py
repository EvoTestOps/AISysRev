import logging
from uuid import UUID

from src.crud.job_crud import JobCrud
from src.db.db_context import DBContext
from src.schemas.job import JobCreate, JobRead
from src.schemas.jobtask import JobTaskRead
from src.services.jobtask_service import JobTaskService, create_jobtask_service

logger = logging.getLogger(__name__)


class JobService:
    def __init__(
        self,
        jobtask_service: JobTaskService,
        job_crud: JobCrud,
    ):
        self.job_crud = job_crud
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
                job_id=task.id,
                paper_uuid=task.paper_uuid,
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
        logger.info("Creating new job", job_data)

        new_job = await self.job_crud.create_job(job_data)
        await self.jobtask_service.bulk_create(new_job.id, job_data.project_uuid)

        job_read = JobRead(
            uuid=new_job.uuid,
            project_uuid=job_data.project_uuid,
            llm_config=new_job.llm_config,
            prompting_config=new_job.prompting_config,
            created_at=new_job.created_at,
            updated_at=new_job.updated_at,
        )
        await self.jobtask_service.start_job_tasks(new_job.id, job_read.model_dump())

        return job_read


def create_job_service(db_ctx: DBContext) -> JobService:
    jobtask_service = create_jobtask_service(db_ctx)
    job_crud = db_ctx.crud(JobCrud)
    return JobService(jobtask_service, job_crud)
