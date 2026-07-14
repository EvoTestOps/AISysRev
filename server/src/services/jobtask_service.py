from uuid import UUID

from src.celery.tasks import process_job_task
from src.crud.jobtask_crud import JobTaskCrud
from src.db.db_context import DBContext
from src.schemas.job import JobScreeningMode
from src.schemas.jobtask import (
    JobTaskCreate,
    JobTaskHumanResult,
    JobTaskRead,
    JobTaskReadWithLLMConfig,
)
from src.schemas.project import Criteria
from src.services.paper_service import PaperService, create_paper_service
from src.tools.per_criteria_stats import compute_criterion_irr


class JobTaskService:
    def __init__(self, jobtask_crud: JobTaskCrud, paper_service: PaperService):
        self.jobtask_crud = jobtask_crud
        self.paper_service = paper_service

    async def fetch_job_tasks(self, job_uuid: UUID, owner_uuid: UUID):
        job_tasks = await self.jobtask_crud.fetch_job_tasks_by_job_uuid(job_uuid, owner_uuid)

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

    async def fetch_job_tasks_for_paper(self, paper_uuid: UUID, owner_uuid: UUID):
        job_tasks_with_jobs = await self.jobtask_crud.fetch_job_tasks_by_paper_uuid(
            paper_uuid, owner_uuid
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
                prompting_config=job.prompting_config,
            )
            for task, job in job_tasks_with_jobs
        ]

    async def fetch_task_stats_by_project(self, project_uuid: UUID, owner_uuid: UUID):
        stats = await self.jobtask_crud.fetch_tasks_stats_by_project(project_uuid, owner_uuid)
        return stats

    async def fetch_task_stats_by_job(self, job_id: int):
        job_stats = await self.jobtask_crud.fetch_task_stats_by_job(job_id)
        return job_stats

    async def add_human_result(self, uuid: UUID, owner_uuid: UUID, human_result: JobTaskHumanResult):
        await self.jobtask_crud.add_jobtask_human_result(uuid, owner_uuid, human_result)

    async def bulk_create(
        self, job_id: int, project_uuid: UUID, owner_uuid: UUID, screening_mode: JobScreeningMode
    ):
        papers = await self.paper_service.fetch_papers_for_screening(
            project_uuid=project_uuid, owner_uuid=owner_uuid, screening_mode=screening_mode
        )
        if len(papers) == 0:
            raise RuntimeError(f"There are no papers for the given project matching screening mode: {screening_mode}.")
        jobtasks = [
            JobTaskCreate(
                job_id=job_id,
                doi=paper.doi,
                title=paper.title,
                abstract=paper.abstract,
                paper_uuid=paper.uuid,
                pdf_file_uuid=paper.pdf_file_uuid,
            )
            for paper in papers
        ]
        return await self.jobtask_crud.bulk_create_jobtasks(jobtasks)

    async def set_unfinished_to_cancelled(self, job_id: int):
        await self.jobtask_crud.update_job_tasks_status_to_cancelled(job_id)

    async def start_job_tasks(self, job_id: int, job_data: dict):
        # job_data is of type JobCreate
        print(f"start_job_tasks: Processing job {job_id}")
        return process_job_task.delay(job_id, job_data)

    async def compute_per_criteria_agreement(
        self, project_uuid: UUID, criteria: Criteria, owner_uuid: UUID
    ) -> dict:
        tasks = await self.jobtask_crud.fetch_per_criteria_tasks_by_project(
            project_uuid, owner_uuid
        )

        rater_job_uuids = sorted({str(t["job_uuid"]) for t in tasks})

        crit_probs: dict[str, dict[str, dict[str, float]]] = {}
        for task in tasks:
            result = task["result"]
            if not result or result.get("mode") != "PER_CRITERIA":
                continue
            job_uuid = str(task["job_uuid"])
            paper_uuid = str(task["paper_uuid"])
            for crit_id, crit_result in result.get("criterion_results", {}).items():
                if not isinstance(crit_result, dict) or "error" in crit_result:
                    continue
                prob = crit_result.get("probability_decision")
                if prob is not None and 0.0 <= float(prob) <= 1.0:
                    crit_probs.setdefault(crit_id, {}).setdefault(job_uuid, {})[
                        paper_uuid
                    ] = float(prob)

        crit_meta = {
            **{
                f"IC{i + 1}": {"description": d, "type": "inclusion"}
                for i, d in enumerate(criteria.inclusion_criteria)
            },
            **{
                f"EC{i + 1}": {"description": d, "type": "exclusion"}
                for i, d in enumerate(criteria.exclusion_criteria)
            },
        }

        criteria_stats = {}
        for crit_id, probs_by_rater in crit_probs.items():
            stats = compute_criterion_irr(probs_by_rater)
            meta = crit_meta.get(crit_id, {"description": "", "type": "unknown"})
            criteria_stats[crit_id] = {**meta, **stats}

        return {
            "n_raters": len(rater_job_uuids),
            "rater_job_uuids": rater_job_uuids,
            "criteria": criteria_stats,
        }


def create_jobtask_service(db_ctx: DBContext) -> JobTaskService:
    jobtask_crud = db_ctx.crud(JobTaskCrud)
    paper_service = create_paper_service(db_ctx)
    return JobTaskService(jobtask_crud, paper_service)
