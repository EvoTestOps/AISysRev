from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional
from src.schemas.project import FewShotPreferences
from src.services.project_service import (
    ProjectPreferences,
    ProjectService,
    get_project_service,
)
from src.event_queue import EventName, QueueItem, push_event
from src.services.setting_service import SettingService, get_setting_service_fastapi
from src.schemas.job import FewShotPromptingConfig, JobCreate, JobRead
from src.services.job_service import JobService, get_job_service

router = APIRouter()


@router.get("/job", status_code=status.HTTP_200_OK, response_model=list[JobRead])
async def get_jobs(
    project: Optional[UUID] = None, jobs: JobService = Depends(get_job_service)
):
    try:
        if project:
            return await jobs.fetch_by_project(project)
        else:
            return await jobs.fetch_all()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch jobs: {str(e)}",
        )


@router.get("/job/{uuid}", status_code=status.HTTP_200_OK, response_model=JobRead)
async def get_single_job(uuid: UUID, jobs: JobService = Depends(get_job_service)):
    try:
        job = await jobs.fetch_by_uuid(uuid)
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
    jobs: JobService = Depends(get_job_service),
    settings: SettingService = Depends(get_setting_service_fastapi),
    projects: ProjectService = Depends(get_project_service),
):
    try:
        openrouter_secret = await settings.get_setting("openrouter_api_key")
        if openrouter_secret is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OpenRouter API key is not set, cannot continue",
            )

        cfg = job_data.prompting_config
        if isinstance(cfg, FewShotPromptingConfig):
            # If the user wants to remember their choice:
            if cfg.remember_selection:
                await projects.update_project_preferences(
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
                await projects.update_project_preferences(
                    job_data.project_uuid,
                    ProjectPreferences(few_shot=None),
                )
        create_job = await jobs.create(job_data)
        await push_event(
            QueueItem(event_name=EventName.JOB_CREATED, value={"uuid": create_job.uuid})
        )
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
