from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional
from src.schemas.job import JobCreate, JobRead
from src.services.job_service import JobService, get_job_service

router = APIRouter()

@router.get("/job", status_code=status.HTTP_200_OK, response_model=list[JobRead])
async def get_jobs(project: Optional[UUID] = None, jobs: JobService = Depends(get_job_service)):
    try:
        if project:
            return await jobs.fetch_by_project(project)
        else:
            return await jobs.fetch_all()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to fetch jobs: {str(e)}")

@router.get("/job/{uuid}", status_code=status.HTTP_200_OK, response_model=JobRead)
async def get_single_job(uuid: UUID, jobs: JobService = Depends(get_job_service)):
    try:
        job = await jobs.fetch_by_uuid(uuid)
        if not job:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
        return job
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to fetch job: {str(e)}")

@router.post("/job", status_code=status.HTTP_201_CREATED)
async def create_job(job_data: JobCreate, jobs: JobService = Depends(get_job_service)):
    try:
        create_job = await jobs.create(job_data)
        return create_job
    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Job creation failed: {str(e)}")
