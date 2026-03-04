import logging
from uuid import UUID

from src.crud.job_crud import JobCrud
from src.db.db_context import DBContext
from src.helpers.resolve_job_status import resolve_job_status
from src.schemas.job import JobCreate, JobRead, JobReadWithStats, JobStats
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
        return [
            JobRead(
                uuid=row.uuid,
                project_uuid=row.project_uuid,
                prompting_config=row.prompting_config,
                llm_config=row.llm_config,
                created_at=row.created_at,
                updated_at=row.updated_at,
            )
            for row in rows
        ]

    async def fetch_by_project(self, project_uuid: UUID) -> list[JobReadWithStats]:
        jobs = await self.job_crud.fetch_jobs_by_project(project_uuid)
        stats_rows = await self.jobtask_service.fetch_task_stats_by_project(
            project_uuid
        )

        stats_map = {row["job_uuid"]: row for row in stats_rows}

        result = []
        for job in jobs:
            stats = stats_map.get(job["uuid"])
            total = stats["total_count"] if stats else 0
            success = stats["success_count"] if stats else 0
            failed = stats["failed_count"] if stats else 0

            job_status = resolve_job_status(total, success, failed)
            result.append(
                JobReadWithStats(
                    **job,
                    stats=JobStats(
                        total=total, success=success, failed=failed, status=job_status
                    ),
                )
            )

        return result

    async def fetch_by_uuid(self, uuid: UUID) -> JobRead:
        job = await self.job_crud.fetch_job_by_uuid(uuid)
        return JobRead(
            uuid=job.uuid,
            project_uuid=job.project_uuid,
            prompting_config=job.prompting_config,
            llm_config=job.llm_config,
            created_at=job.created_at,
            updated_at=job.updated_at,
        )

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
