from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from src.core.auth import get_current_user
from src.db.db_context import DBContext, get_db_ctx
from src.db.models.user import User
from src.schemas.jobtask import JobTaskHumanResultUpdate, JobTaskReadWithLLMConfig
from src.services.job_service import create_job_service
from src.services.jobtask_service import create_jobtask_service
from src.services.paper_service import create_paper_service
from src.services.project_service import create_project_service

router = APIRouter()


@router.get("/jobtask/{uuid}", status_code=status.HTTP_200_OK, tags=["Job task"])
async def get_job_tasks(
    uuid: UUID,
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    job_service = create_job_service(db_ctx)
    project_service = create_project_service(db_ctx)
    jobtask_service = create_jobtask_service(db_ctx)
    try:
        job = await job_service.fetch_by_uuid(uuid)
        project = await project_service.fetch_by_uuid(job.project_uuid, owner_uuid=current_user.uuid)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Job tasks not found"
            )
        job_tasks = await jobtask_service.fetch_job_tasks(uuid)
        if not job_tasks:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Job tasks not found"
            )
        return job_tasks
    except HTTPException:
        raise
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job tasks not found"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch job tasks: {str(e)}",
        )


@router.get(
    "/jobtask",
    status_code=status.HTTP_200_OK,
    response_model=list[JobTaskReadWithLLMConfig],
    tags=["Job task"],
)
async def get_job_tasks_by_paper(
    paper_uuid: UUID,
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    paper_service = create_paper_service(db_ctx)
    project_service = create_project_service(db_ctx)
    jobtask_service = create_jobtask_service(db_ctx)
    try:
        paper = await paper_service.fetch_by_uuid(paper_uuid)
        if not paper:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found"
            )
        project = await project_service.fetch_by_uuid(paper.project_uuid, owner_uuid=current_user.uuid)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found"
            )
        job_tasks = await jobtask_service.fetch_job_tasks_for_paper(paper_uuid)
        if not job_tasks:
            return []
        return job_tasks
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch job tasks: {str(e)}",
        )


@router.patch("/jobtask/{uuid}", status_code=status.HTTP_200_OK, tags=["Job task"])
async def add_job_task_human_result(
    uuid: UUID,
    result: JobTaskHumanResultUpdate,
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    jobtask_service = create_jobtask_service(db_ctx)
    project_service = create_project_service(db_ctx)
    try:
        project_uuid = await jobtask_service.fetch_project_uuid_for_jobtask(uuid)
        if project_uuid is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Job task not found"
            )
        project = await project_service.fetch_by_uuid(project_uuid, owner_uuid=current_user.uuid)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Job task not found"
            )
        await jobtask_service.add_human_result(uuid, result.human_result)
        await db_ctx.commit()
        return {"detail": "Job task human result added successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add job task human result: {str(e)}",
        )
