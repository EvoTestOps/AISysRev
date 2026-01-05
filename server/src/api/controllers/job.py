from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from src.db.db_context import DBContext, get_db_ctx
from src.schemas.job import FewShotPromptingConfig, JobCreate, JobRead
from src.schemas.project import FewShotPreferences
from src.services.job_service import create_job_service
from src.services.project_service import (
    ProjectPreferences,
    create_project_service,
)
from src.services.setting_service import create_setting_service

router = APIRouter()


@router.get("/job", status_code=status.HTTP_200_OK, response_model=list[JobRead])
async def get_jobs(
    project: Optional[UUID] = None, db_ctx: DBContext = Depends(get_db_ctx)
):
    try:
        job_service = create_job_service(db_ctx)
        if project:
            return await job_service.fetch_by_project(project)
        else:
            return await job_service.fetch_all()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch jobs: {str(e)}",
        )


@router.get("/job/{uuid}", status_code=status.HTTP_200_OK, response_model=JobRead)
async def get_single_job(uuid: UUID, db_ctx: DBContext = Depends(get_db_ctx)):
    try:
        job_service = create_job_service(db_ctx)
        job = await job_service.fetch_by_uuid(uuid)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Job not found"
            )
        return job
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch job: {str(e)}",
        )


@router.post("/job", status_code=status.HTTP_201_CREATED)
async def create_job(
    job_data: JobCreate,
    db_ctx: DBContext = Depends(get_db_ctx),
):

    job_service = create_job_service(db_ctx)
    setting_service = create_setting_service(db_ctx)
    project_service = create_project_service(db_ctx)

    try:
        openrouter_secret = setting_service.get_setting("openrouter_api_key")
        if openrouter_secret is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OpenRouter API key is not set, cannot continue",
            )

        cfg = job_data.prompting_config
        if isinstance(cfg, FewShotPromptingConfig):
            # If the user wants to remember their choice:
            if cfg.remember_selection:
                await project_service.update_project_preferences(
                    job_data.project_uuid,
                    # TODO: Validate seed paper validity. Seed papers must exist in the system.
                    ProjectPreferences(
                        few_shot=FewShotPreferences(
                            inc_seed_papers=cfg.seed_paper_inc,
                            exc_seed_papers=cfg.seed_paper_exc,
                        )
                    ),
                )
            else:
                # Otherwise, empty few-shot selection
                await project_service.update_project_preferences(
                    job_data.project_uuid,
                    ProjectPreferences(few_shot=None),
                )
        create_job = await job_service.create(job_data)
        await db_ctx.commit()
        return create_job
    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Job creation failed: {str(e)}",
        )
