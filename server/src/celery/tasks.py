import asyncio
import logging
from typing import Dict
from uuid import UUID

from httpx import AsyncClient, HTTPStatusError
from pydantic_ai.retries import AsyncTenacityTransport, RetryConfig, wait_retry_after
from tenacity import retry_if_exception_type, stop_after_attempt, wait_exponential

from celery import Task
from src.crud.jobtask_crud import JobTaskCrud
from src.crud.project_crud import ProjectCrud
from src.db.db_context import DBContext
from src.event_queue import EventName, QueueItem, publish_event
from src.helpers.resolve_job_status import resolve_job_status
from src.redis_client.client import get_redis_client
from src.schemas.job import JobCreate, JobScreeningMode, PerCriteriaPromptingConfig
from src.schemas.jobtask import JobTaskStatus
from src.schemas.llm import ProviderRuntimeParameters
from src.schemas.project import Criteria
from src.services.llm_service import create_llm_service
from src.services.paper_service import create_paper_service
from src.services.pdf_screening_service import create_pdf_screening_service
from src.tools.boolean_parser import (
    build_criteria_tree_with_expressions,
    compute_overall,
    extract_leaf_criteria,
)
from src.tools.llm_decision_creator import (
    get_single_criterion_response,
    get_structured_response,
)
from src.worker import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="tasks.test_task")
def test_task(name: str):
    import time

    print(f"Task started for {name}")
    time.sleep(3)
    print(f"Task done for {name}")
    return f"Hello, {name}!"


@celery_app.task(name="tasks.process_job", bind=True)
def process_job_task(self: Task, job_id: int, job_data: dict):
    job_data_unpacked = JobCreate.model_validate(job_data)
    logger.info("Running job task using asyncio, ID: %s", job_id)
    asyncio.run(process_job(self, job_id, job_data_unpacked))


def _create_retrying_client(max_attempts: int = 3, max_wait_seconds=60) -> AsyncClient:
    def should_retry_status(response):
        if response.status_code in (429, 502, 503, 504):
            response.raise_for_status()

    transport = AsyncTenacityTransport(
        config=RetryConfig(
            retry=retry_if_exception_type((HTTPStatusError, ConnectionError)),
            wait=wait_retry_after(
                fallback_strategy=wait_exponential(multiplier=1, max=60),
                max_wait=max_wait_seconds,
            ),
            stop=stop_after_attempt(max_attempts),
            reraise=True,
        ),
        validate_response=should_retry_status,
    )
    return AsyncClient(transport=transport)


async def _update_progress(
    celery_task: Task,
    redis,
    job_id: int,
    owner_uuid: UUID,
    counter: Dict[str, int],
    counter_lock: asyncio.Lock,
    update_interval: int,
):
    async with counter_lock:
        counter["completed"] += 1
        completed = counter["completed"]
        total = counter["total"]
        success = counter["success"]
        failed = counter["failed"]
        should_update = completed % update_interval == 0

    if should_update:
        status = resolve_job_status(total, success, failed, cancelled=0)
        try:
            await publish_event(
                owner_uuid,
                QueueItem(
                    event_name=EventName.JOB_PROGRESS,
                    value={
                        "job_id": job_id,
                        "stats": {
                            "total": total,
                            "success": success,
                            "failed": failed,
                            "status": status,
                        },
                    },
                ),
                redis_client=redis,
            )
        except Exception:
            logger.exception("Failed to publish progress to Redis")
        try:
            celery_task.update_state(
                state="PROGRESS", meta={"current": completed, "total": total}
            )
        except Exception:
            logger.exception("Failed to update celery progress counter")


async def _process_standard_task(
    celery_task: Task,
    job_task_id: int,
    job_id: int,
    job_data: JobCreate,
    project_criteria: Criteria,
    semaphore: asyncio.Semaphore,
    redis,
    counter: Dict[str, int],
    counter_lock: asyncio.Lock,
    client: AsyncClient,
    update_interval: int = 5,
):
    async with semaphore:
        try:
            async with DBContext() as task_db_ctx:
                jobtask_crud = task_db_ctx.crud(JobTaskCrud)
                job_task = await jobtask_crud.fetch_job_task_by_id(job_task_id)

                llm_service = create_llm_service(task_db_ctx)
                paper_service = create_paper_service(task_db_ctx)
                pdf_screening_service = create_pdf_screening_service(task_db_ctx)

                await jobtask_crud.update_job_task_status(
                    job_task.id, JobTaskStatus.RUNNING
                )
                await task_db_ctx.commit()

                llm_result = await get_structured_response(
                    llm_service,
                    paper_service,
                    pdf_screening_service,
                    job_task,
                    job_data,
                    project_criteria,
                    client,
                )

                await jobtask_crud.update_job_task_result(job_task.id, llm_result)
                await jobtask_crud.update_job_task_status(
                    job_task.id, JobTaskStatus.DONE
                )
                await task_db_ctx.commit()

                async with counter_lock:
                    counter["success"] += 1

        except Exception as e:
            try:
                async with DBContext() as task_err_db_ctx:
                    err_jobtask_crud = task_err_db_ctx.crud(JobTaskCrud)
                    await err_jobtask_crud.update_job_task_status(
                        job_task_id, JobTaskStatus.ERROR
                    )
                    await err_jobtask_crud.update_job_task_error(job_task_id, str(e))
                    await task_err_db_ctx.commit()

                    async with counter_lock:
                        counter["failed"] += 1

            except Exception as err_db_exc:
                logger.exception(
                    "Failed to write error to database for job_task %s: %s",
                    job_task_id,
                    err_db_exc,
                )
            try:
                await publish_event(
                    job_data.owner_uuid,
                    QueueItem(
                        event_name=EventName.JOB_TASK_ERROR,
                        value={
                            "job_task_id": job_task_id,
                            "status": JobTaskStatus.ERROR,
                            "message": str(e),
                        },
                    ),
                    redis_client=redis,
                )
            except Exception:
                logger.exception("Failed to publish error %s", job_task_id)
        finally:
            await _update_progress(
                celery_task,
                redis,
                job_id,
                job_data.owner_uuid,
                counter,
                counter_lock,
                update_interval,
            )


async def _process_per_criteria_task(
    celery_task: Task,
    job_task_id: int,
    job_id: int,
    job_data: JobCreate,
    criteria_tree: dict,
    semaphore: asyncio.Semaphore,
    redis,
    counter: Dict[str, int],
    counter_lock: asyncio.Lock,
    client: AsyncClient,
    update_interval: int = 5,
):
    async with semaphore:
        try:
            async with DBContext() as db_ctx:
                jobtask_crud = db_ctx.crud(JobTaskCrud)
                job_task = await jobtask_crud.fetch_job_task_by_id(job_task_id)
                llm_service = create_llm_service(db_ctx)

                await jobtask_crud.update_job_task_status(
                    job_task.id, JobTaskStatus.RUNNING
                )
                await db_ctx.commit()

                leaf_nodes = extract_leaf_criteria(
                    criteria_tree.get("inclusion", {})
                ) + extract_leaf_criteria(criteria_tree.get("exclusion", {}))

                criterion_results: dict = {}
                criterion_probs: dict = {}
                for leaf in leaf_nodes:
                    crit_id = leaf["id"]
                    try:
                        response = await get_single_criterion_response(
                            llm_service,
                            job_data,
                            job_task.title,
                            job_task.abstract,
                            leaf["description"],
                            client,
                        )
                        criterion_results[crit_id] = response.model_dump()
                        prob = response.probability_decision
                        criterion_probs[crit_id] = prob if 0.0 <= prob <= 1.0 else None
                    except Exception as e:
                        logger.error(
                            "Criterion %s failed for task %s: %s",
                            crit_id,
                            job_task_id,
                            e,
                        )
                        criterion_results[crit_id] = {"error": str(e)}
                        criterion_probs[crit_id] = None

                incl, excl, overall, binary = compute_overall(
                    criteria_tree, criterion_probs
                )
                result = {
                    "mode": "PER_CRITERIA",
                    "criterion_results": criterion_results,
                    "inclusion_probability": incl,
                    "exclusion_probability": excl,
                    "overall_probability": overall,
                    "binary_decision": binary,
                }

                await jobtask_crud.update_job_task_result(job_task.id, result)
                await jobtask_crud.update_job_task_status(
                    job_task.id, JobTaskStatus.DONE
                )
                await db_ctx.commit()

                async with counter_lock:
                    counter["success"] += 1

        except Exception as e:
            try:
                async with DBContext() as err_db_ctx:
                    err_crud = err_db_ctx.crud(JobTaskCrud)
                    await err_crud.update_job_task_status(
                        job_task_id, JobTaskStatus.ERROR
                    )
                    await err_crud.update_job_task_error(job_task_id, str(e))
                    await err_db_ctx.commit()
                    async with counter_lock:
                        counter["failed"] += 1
            except Exception:
                logger.exception(
                    "Failed to write error to DB for job_task %s", job_task_id
                )
            try:
                await publish_event(
                    job_data.owner_uuid,
                    QueueItem(
                        event_name=EventName.JOB_TASK_ERROR,
                        value={
                            "job_task_id": job_task_id,
                            "status": JobTaskStatus.ERROR,
                            "message": str(e),
                        },
                    ),
                    redis_client=redis,
                )
            except Exception:
                logger.exception("Failed to publish error for job_task %s", job_task_id)

        finally:
            await _update_progress(
                celery_task,
                redis,
                job_id,
                job_data.owner_uuid,
                counter,
                counter_lock,
                update_interval,
            )


async def process_job(
    celery_task: Task,
    job_id: int,
    job_data: JobCreate,
    max_concurrent_tasks: int = 20,
    max_retries: int = 3,
    update_interval: int = 5,
):
    logger.info("process_job: Starting to process job %s", job_id)
    redis = get_redis_client()
    client = _create_retrying_client(max_attempts=max_retries)

    async with DBContext() as db_ctx:
        project_crud = db_ctx.crud(ProjectCrud)
        jobtask_crud = db_ctx.crud(JobTaskCrud)

        logger.info("Fetching project by UUID %s", job_data.project_uuid)
        project = await project_crud.fetch_project_by_uuid(
            job_data.project_uuid, job_data.owner_uuid
        )
        if project is None:
            raise RuntimeError("Project not found")

        project_criteria = project.criteria

        criteria_tree: dict | None = None
        if isinstance(job_data.prompting_config, PerCriteriaPromptingConfig):
            inc_list: list[str] = project_criteria["inclusion_criteria"]
            exc_list: list[str] = project_criteria["exclusion_criteria"]
            inc_expr: str | None = project_criteria.get("inclusion_expression")
            exc_expr: str | None = project_criteria.get("exclusion_expression")
            criteria_tree = build_criteria_tree_with_expressions(
                inc_list, exc_list, inc_expr, exc_expr
            )

        if job_data.screening_mode in (
            JobScreeningMode.PDF,
            JobScreeningMode.AUTOMATIC,
        ):
            try:
                llm_service = create_llm_service(db_ctx)
                pdf_screening_service = create_pdf_screening_service(db_ctx)
                llm = llm_service.get_llm(job_data.llm_config.provider_name)
                api_key = None
                if llm.api_key_config_parameter is not None:
                    api_key = await llm_service.setting_service.get_setting(
                        llm.api_key_config_parameter.key,
                        owner_uuid=job_data.owner_uuid,
                        mask_secret=False,
                    )
                await pdf_screening_service.get_criteria_embeddings(
                    llm,
                    job_data.llm_config.provider_parameters,
                    ProviderRuntimeParameters(
                        model=job_data.llm_config.model_name,
                        api_key=api_key.value if api_key is not None else "Mock",
                    ),
                    client,
                    job_data.project_uuid,
                    job_data.owner_uuid,
                    project_criteria["inclusion_criteria"],
                    project_criteria["exclusion_criteria"],
                )
            except Exception:
                logger.exception(
                    "Failed to precompute criteria embeddings for job %s", job_id
                )

        logger.info("Updating job task status to %s", JobTaskStatus.PENDING)
        await jobtask_crud.update_job_tasks_status(job_id, JobTaskStatus.PENDING)
        await db_ctx.commit()

        job_tasks = await jobtask_crud.fetch_job_tasks_by_job_id(job_id)
        job_task_ids = [jt.id for jt in job_tasks]

    semaphore = asyncio.Semaphore(max_concurrent_tasks)
    counter_lock = asyncio.Lock()
    counter = {"completed": 0, "success": 0, "failed": 0, "total": len(job_task_ids)}

    if isinstance(job_data.prompting_config, PerCriteriaPromptingConfig):
        if criteria_tree is None:
            raise ValueError("Criteria tree is not defined")
        tasks = [
            _process_per_criteria_task(
                celery_task=celery_task,
                job_task_id=jt_id,
                job_id=job_id,
                job_data=job_data,
                criteria_tree=criteria_tree,
                semaphore=semaphore,
                redis=redis,
                counter=counter,
                counter_lock=counter_lock,
                client=client,
                update_interval=update_interval,
            )
            for jt_id in job_task_ids
        ]
    else:
        tasks = [
            _process_standard_task(
                celery_task=celery_task,
                job_task_id=jt_id,
                job_id=job_id,
                job_data=job_data,
                project_criteria=project_criteria,
                semaphore=semaphore,
                redis=redis,
                counter=counter,
                counter_lock=counter_lock,
                client=client,
                update_interval=update_interval,
            )
            for jt_id in job_task_ids
        ]

    await asyncio.gather(*tasks)

    final_status = resolve_job_status(
        counter["total"], counter["success"], counter["failed"], cancelled=0
    )
    await publish_event(
        job_data.owner_uuid,
        QueueItem(
            event_name=EventName.JOB_PROGRESS,
            value={
                "job_id": job_id,
                "stats": {
                    "total": counter["total"],
                    "success": counter["success"],
                    "failed": counter["failed"],
                    "status": final_status,
                },
            },
        ),
        redis_client=redis,
    )

    await redis.aclose()

    return {"result": "all job tasks processed"}


def cancel_task(task_id: UUID):
    celery_app.control.revoke(str(task_id), terminate=True)
