from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from src.core.auth import get_current_user
from src.db.db_context import DBContext, get_db_ctx
from src.db.models.user import User
from src.schemas.jobtask import JobTaskHumanResultUpdate, JobTaskReadWithLLMConfig
from src.services.jobtask_service import create_jobtask_service

router = APIRouter()


@router.get("/jobtask/{uuid}", status_code=status.HTTP_200_OK, tags=["Job task"])
async def get_job_tasks(
    uuid: UUID,
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    jobtask_service = create_jobtask_service(db_ctx)
    try:
        job_tasks = await jobtask_service.fetch_job_tasks(uuid, current_user.uuid)
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
    jobtask_service = create_jobtask_service(db_ctx)
    try:
        job_tasks = await jobtask_service.fetch_job_tasks_for_paper(paper_uuid, current_user.uuid)
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
    try:
        await jobtask_service.add_human_result(uuid, current_user.uuid, result.human_result)
        await db_ctx.commit()
        return {"detail": "Job task human result added successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add job task human result: {str(e)}",
        )
