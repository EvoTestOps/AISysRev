"""
Celery tasks for classification jobs.

Handles multi-class probability classification using pydantic_ai agents
with parallel processing via async_api_adapter.
"""

import asyncio
import logging
from typing import Dict, List, Optional

from celery import Task
from pydantic import BaseModel, Field

from src.celery.tasks import _publish_redis_event
from src.core.async_api_adapter import create_agent, process_batch_agent
from src.core.classification_prompts import format_classification_prompt
from src.crud.classification_crud import ClassificationCrud
from src.crud.jobtask_crud import JobTaskCrud
from src.crud.paper_crud import PaperCrud
from src.db.db_context import DBContext
from src.event_queue import EventName
from src.redis_client.client import get_redis_client
from src.schemas.classification import ClassificationDimension
from src.schemas.jobtask import JobTaskStatus
from src.services.classification_service import ClassificationService
from src.worker import celery_app

logger = logging.getLogger(__name__)


class ClassificationResponse(BaseModel, extra="forbid"):
    """Structured response for classification probability."""

    probability_decision: float = Field(
        description="A probability that the study belongs to the specified class",
        ge=0.0,
        le=1.0,
    )


@celery_app.task(name="tasks.process_classification_job", bind=True)
def process_classification_job_task(
    self: Task, job_id: int, job_data: dict, classification_type: str = "multi"
):
    """
    Process a classification job.

    Args:
        job_id: ID of the job
        job_data: Job configuration (includes classification_config_id)
        classification_type: Type of classification ('multi' or 'single')
    """
    logger.info(
        "Running classification job task using asyncio, ID: %s, type: %s",
        job_id,
        classification_type,
    )
    asyncio.run(process_classification_job(self, job_id, job_data, classification_type))


async def process_classification_job(
    celery_task: Task,
    job_id: int,
    job_data: dict,
    classification_type: str,
    max_concurrent: int = 20,
):
    """
    Process all papers in a classification job using parallel LLM calls.

    This function:
    1. Loads the classification config
    2. Fetches all papers for the job
    3. Generates prompts (one per class per paper)
    4. Processes all prompts in parallel using async_api_adapter
    5. Parses results and assigns chosen classes
    6. Stores results in job_task results
    """
    logger.info("process_classification_job: Starting job %s", job_id)
    redis = get_redis_client()

    async with DBContext() as db_ctx:
        classification_crud = db_ctx.crud(ClassificationCrud)
        jobtask_crud = db_ctx.crud(JobTaskCrud)
        paper_crud = db_ctx.crud(PaperCrud)

        # Get classification config
        classification_config_id = job_data.get("classification_config_id")
        if not classification_config_id:
            raise ValueError("classification_config_id is required in job_data")

        config = await classification_crud.fetch_by_id(classification_config_id)
        if not config:
            raise RuntimeError("Classification config not found")

        # Convert JSONB to Pydantic models
        classifications = [
            ClassificationDimension(**c) for c in config.classifications
        ]

        # Get job tasks (papers to classify)
        job_tasks = await jobtask_crud.fetch_job_tasks_by_job_id(job_id)
        if not job_tasks:
            logger.warning("No job tasks found for job %s", job_id)
            return {"result": "no tasks to process"}

        # Update all tasks to PENDING
        await jobtask_crud.update_job_tasks_status(job_id, JobTaskStatus.PENDING)
        await db_ctx.commit()

        # Prepare paper data
        papers = []
        for job_task in job_tasks:
            paper = await paper_crud.fetch_paper_by_id(job_task.paper_id)
            if paper:
                papers.append(
                    {
                        "job_task_id": job_task.id,
                        "paper_id": paper.id,
                        "title": paper.title,
                        "abstract": paper.abstract,
                    }
                )

        logger.info("Processing %d papers for classification", len(papers))

        # Generate all prompts
        all_prompts = []
        prompt_mapping = []  # Track which prompt belongs to which paper

        for i, paper_data in enumerate(papers):
            for classification in classifications:
                for class_name in classification.classes:
                    prompt = format_classification_prompt(
                        title=paper_data["title"],
                        abstract=paper_data["abstract"],
                        systematic_review_context=config.systematic_review_context,
                        classification_name=classification.name,
                        class_name=class_name,
                    )
                    all_prompts.append(prompt)
                    prompt_mapping.append(
                        {
                            "paper_index": i,
                            "classification_name": classification.name,
                            "class_name": class_name,
                        }
                    )

        logger.info("Generated %d prompts total", len(all_prompts))

        # Get LLM config
        llm_config = job_data.get("llm_config", {})
        model_name = llm_config.get("model_name", "openai/gpt-4o-mini")
        api_key = llm_config.get("api_key", "")

        if not api_key:
            raise ValueError("API key is required in llm_config")

        # Progress tracking
        total_prompts = len(all_prompts)
        completed_prompts = 0

        async def progress_callback(current: int, total: int):
            """Update Celery task progress."""
            nonlocal completed_prompts
            completed_prompts = current
            try:
                celery_task.update_state(
                    state="PROGRESS",
                    meta={
                        "current": current,
                        "total": total,
                        "message": f"Processing {current}/{total} classifications",
                    },
                )
            except Exception as e:
                logger.exception("Failed to update celery progress: %s", e)

        # Process all prompts in parallel using async_api_adapter
        agent = create_agent(
            model_name=model_name,
            api_key=api_key,
            system_prompt="",
            output_type=ClassificationResponse,
        )

        results = await process_batch_agent(
            prompts=all_prompts,
            agent=agent,
            model_name=model_name,
            max_concurrent=max_concurrent,
            progress_callback=progress_callback,
        )

        logger.info("Received %d results", len(results))

        # Parse results per paper
        classes_per_paper = sum(len(c.classes) for c in classifications)

        for i, paper_data in enumerate(papers):
            job_task_id = paper_data["job_task_id"]

            try:
                # Update status to RUNNING
                await jobtask_crud.update_job_task_status(
                    job_task_id, JobTaskStatus.RUNNING
                )
                await db_ctx.commit()

                await _publish_redis_event(
                    redis,
                    EventName.JOB_TASK_RUNNING,
                    {"job_task_id": job_task_id, "status": JobTaskStatus.RUNNING},
                )

                # Extract results for this paper
                start_idx = i * classes_per_paper
                end_idx = (i + 1) * classes_per_paper
                paper_results = results[start_idx:end_idx]

                # Convert structured responses to probabilities
                probabilities = [
                    (
                        r.probability_decision
                        if r and hasattr(r, "probability_decision")
                        else None
                    )
                    for r in paper_results
                ]

                # Parse and format results
                formatted_results = ClassificationService.parse_classification_results(
                    results=probabilities,
                    classifications=classifications,
                    paper_index=i,
                )

                # Store results
                await jobtask_crud.update_job_task_result(
                    job_task_id, {"classifications": formatted_results}
                )
                await jobtask_crud.update_job_task_status(
                    job_task_id, JobTaskStatus.DONE
                )
                await db_ctx.commit()

                await _publish_redis_event(
                    redis,
                    EventName.JOB_TASK_DONE,
                    {"job_task_id": job_task_id, "status": JobTaskStatus.DONE},
                )

            except Exception as e:
                logger.exception("Error processing paper %d: %s", i, e)
                try:
                    await jobtask_crud.update_job_task_status(
                        job_task_id, JobTaskStatus.ERROR
                    )
                    await jobtask_crud.update_job_task_error(job_task_id, str(e))
                    await db_ctx.commit()

                    await _publish_redis_event(
                        redis,
                        EventName.JOB_TASK_ERROR,
                        {
                            "job_task_id": job_task_id,
                            "status": JobTaskStatus.ERROR,
                            "message": str(e),
                        },
                    )
                except Exception as err_exc:
                    logger.exception(
                        "Failed to record error for job_task %s: %s",
                        job_task_id,
                        err_exc,
                    )

    logger.info("Classification job %s complete", job_id)
    return {"result": f"Processed {len(papers)} papers"}
