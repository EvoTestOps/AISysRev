from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from src.schemas.jobtask import JobTaskHumanResultUpdate, JobTaskReadWithLLMConfig
from src.services.jobtask_service import create_jobtask_service
from src.db.db_context import DBContext, get_db_ctx

router = APIRouter()


@router.get("/jobtask/{uuid}", status_code=status.HTTP_200_OK)
async def get_job_tasks(uuid: UUID, db_ctx: DBContext = Depends(get_db_ctx)):
    try:
        jobtask_service = create_jobtask_service(db_ctx)
        job_tasks = await jobtask_service.fetch_job_tasks(uuid)
        if not job_tasks:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Job tasks not found"
            )
        return job_tasks
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch job tasks: {str(e)}",
        )


@router.get(
    "/jobtask",
    status_code=status.HTTP_200_OK,
    response_model=list[JobTaskReadWithLLMConfig],
)
async def get_job_tasks_by_paper(
    paper_uuid: str, db_ctx: DBContext = Depends(get_db_ctx)
):
    try:
        jobtask_service = create_jobtask_service(db_ctx)
        job_tasks = await jobtask_service.fetch_job_tasks_for_paper(paper_uuid)
        if not job_tasks:
            # raise HTTPException(
            #     status_code=status.HTTP_404_NOT_FOUND, detail="Job tasks not found"
            # )
            return []
        return job_tasks
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch job tasks: {str(e)}",
        )


@router.patch("/jobtask/{uuid}", status_code=status.HTTP_200_OK)
async def add_job_task_human_result(
    uuid: UUID,
    result: JobTaskHumanResultUpdate,
    db_ctx: DBContext = Depends(get_db_ctx),
):
    try:
        jobtask_service = create_jobtask_service(db_ctx)
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
