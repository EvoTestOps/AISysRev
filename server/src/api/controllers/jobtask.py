from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from src.schemas.jobtask import JobTaskHumanResultUpdate
from src.services.jobtask_service import JobTaskService, get_jobtask_service

router = APIRouter()

@router.get("/jobtask/{uuid}", status_code=status.HTTP_200_OK)
async def get_job_tasks(uuid: UUID, jobtasks: JobTaskService = Depends(get_jobtask_service)):
    try:
        job_tasks = await jobtasks.fetch_job_tasks(uuid)
        if not job_tasks:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job tasks not found")
        return job_tasks
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to fetch job tasks: {str(e)}")

@router.post("/jobtask/{uuid}", status_code=status.HTTP_200_OK)
async def add_job_task_human_result(
    uuid: UUID,
    result: JobTaskHumanResultUpdate,
    jobtasks: JobTaskService = Depends(get_jobtask_service)
):
    try:
        await jobtasks.add_human_result(uuid, result.human_result)
        return {"detail": "Job task human result added successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to add job task human result: {str(e)}")