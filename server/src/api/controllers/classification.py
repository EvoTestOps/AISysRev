from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from src.crud.classification_crud import ClassificationCrud
from src.crud.job_crud import JobCrud
from src.crud.jobtask_crud import JobTaskCrud
from src.crud.paper_crud import PaperCrud
from src.crud.project_crud import ProjectCrud
from src.db.db_context import DBContext, get_db_ctx
from src.schemas.classification import (
    ClassificationConfigCreate,
    ClassificationConfigRead,
    ClassificationConfigUpdate,
)
from src.schemas.job import LLMModelConfig
from src.services.classification_service import create_classification_service

router = APIRouter()


@router.get(
    "/classification-config",
    status_code=status.HTTP_200_OK,
    response_model=list[ClassificationConfigRead],
    tags=["Classification"],
)
async def list_classification_configs(db_ctx: DBContext = Depends(get_db_ctx)):
    """List all classification configurations."""
    service = create_classification_service(db_ctx)
    try:
        return await service.fetch_all()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch classification configs: {str(e)}",
        )


@router.get(
    "/projects/{project_uuid}/classification-configs",
    status_code=status.HTTP_200_OK,
    response_model=list[ClassificationConfigRead],
    tags=["Classification"],
)
async def list_project_classification_configs(
    project_uuid: UUID, db_ctx: DBContext = Depends(get_db_ctx)
):
    """List all classification configurations for a specific project."""
    service = create_classification_service(db_ctx)
    try:
        return await service.fetch_by_project_uuid(project_uuid)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch classification configs: {str(e)}",
        )


@router.get(
    "/classification-config/{uuid}",
    status_code=status.HTTP_200_OK,
    response_model=ClassificationConfigRead,
    tags=["Classification"],
)
async def get_classification_config(
    uuid: UUID, db_ctx: DBContext = Depends(get_db_ctx)
):
    """Get a specific classification configuration by UUID."""
    service = create_classification_service(db_ctx)
    try:
        config = await service.fetch_by_uuid(uuid)
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Classification config not found",
            )
        return config
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch classification config: {str(e)}",
        )


@router.post(
    "/classification-config",
    status_code=status.HTTP_201_CREATED,
    tags=["Classification"],
)
async def create_classification_config(
    config_data: ClassificationConfigCreate, db_ctx: DBContext = Depends(get_db_ctx)
):
    """Create a new classification configuration."""
    service = create_classification_service(db_ctx)
    try:
        config_id, config_uuid = await service.create(config_data)
        await db_ctx.commit()
        return {"id": config_id, "uuid": str(config_uuid)}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Classification config creation failed: {str(e)}",
        )


@router.put(
    "/classification-config/{uuid}",
    status_code=status.HTTP_200_OK,
    response_model=ClassificationConfigRead,
    tags=["Classification"],
)
async def update_classification_config(
    uuid: UUID,
    config_data: ClassificationConfigUpdate,
    db_ctx: DBContext = Depends(get_db_ctx),
):
    """Update an existing classification configuration."""
    service = create_classification_service(db_ctx)
    try:
        updated_config = await service.update(uuid, config_data)
        if not updated_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Classification config not found",
            )
        await db_ctx.commit()
        return updated_config
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update classification config: {str(e)}",
        )


@router.delete(
    "/classification-config/{uuid}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Classification"],
)
async def delete_classification_config(
    uuid: UUID, db_ctx: DBContext = Depends(get_db_ctx)
):
    """Delete a classification configuration."""
    service = create_classification_service(db_ctx)
    try:
        deleted = await service.delete(uuid)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Classification config not found",
            )
        await db_ctx.commit()
        return {"detail": "Classification config deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete classification config: {str(e)}",
        )


class ClassificationJobRequest(BaseModel):
    classification_config_uuid: UUID
    llm_config: LLMModelConfig
    paper_uuids: Optional[List[UUID]] = None  # If None, classify all papers in project


@router.post(
    "/classification-job",
    status_code=status.HTTP_201_CREATED,
    tags=["Classification"],
)
async def create_classification_job(
    request: ClassificationJobRequest, db_ctx: DBContext = Depends(get_db_ctx)
):
    """Create and start a classification job."""
    classification_crud = db_ctx.crud(ClassificationCrud)
    job_crud = db_ctx.crud(JobCrud)
    jobtask_crud = db_ctx.crud(JobTaskCrud)
    paper_crud = db_ctx.crud(PaperCrud)
    project_crud = db_ctx.crud(ProjectCrud)

    try:
        # Fetch classification config
        config = await classification_crud.fetch_by_uuid(
            request.classification_config_uuid
        )
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Classification config not found",
            )

        # Fetch project to get project_id
        project = await project_crud.fetch_project_by_uuid(config.project_uuid)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found",
            )

        # Create job record
        from src.db.models.job import Job

        job = Job(
            project_id=project.id,
            prompting_config={},  # Not used for classification
            llm_config=request.llm_config.model_dump(),
            job_type="classification",
            classification_config_id=config.id,
        )
        db_ctx.session.add(job)
        await db_ctx.flush()

        # Determine which papers to classify
        if request.paper_uuids:
            papers = []
            for paper_uuid in request.paper_uuids:
                paper = await paper_crud.fetch_paper_by_uuid(paper_uuid)
                if paper:
                    papers.append(paper)
        else:
            # Classify all papers in the project
            papers = await paper_crud.fetch_papers_by_project_uuid(config.project_uuid)

        # Create job tasks
        from src.db.models.jobtask import JobTask
        from src.schemas.jobtask import JobTaskStatus

        for paper in papers:
            job_task = JobTask(
                job_id=job.id,
                paper_uuid=paper.uuid,
                title=paper.title,
                abstract=paper.abstract,
                doi=paper.doi,
                status=JobTaskStatus.NOT_STARTED,
            )
            db_ctx.session.add(job_task)

        await db_ctx.commit()

        # Prepare job data for Celery task
        job_data = {
            "classification_config_id": config.id,
            "llm_config": {
                "model_name": request.llm_config.model_name,
                "api_key": request.llm_config.provider_parameters.get("api_key", ""),
            },
        }

        # Trigger Celery task (import here to avoid circular import)
        from src.celery.tasks_classification import process_classification_job_task
        task = process_classification_job_task.delay(job.id, job_data)

        return {
            "job_id": job.id,
            "job_uuid": str(job.uuid),
            "task_id": task.id,
            "message": f"Classification job started for {len(papers)} papers",
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Classification job creation failed: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create classification job: {str(e)}",
        )
