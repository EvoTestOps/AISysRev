from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from src.db.db_context import DBContext, get_db_ctx
from src.event_queue import EventName, QueueItem, push_event
from src.schemas.job import JobPromptingType
from src.schemas.project import ProjectCreate, ProjectRead
from src.schemas.token_estimation import TokenEstimation, TokenEstimationRequest
from src.services.paper_service import create_paper_service
from src.services.project_service import create_project_service
from src.services.token_estimation_service import create_token_estimation_service

router = APIRouter()


@router.get(
    "/project",
    status_code=status.HTTP_200_OK,
    response_model=list[ProjectRead],
    tags=["Project"],
)
async def list_projects(db_ctx: DBContext = Depends(get_db_ctx)):
    projects = create_project_service(db_ctx)
    try:
        return await projects.fetch_all()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch projects: {str(e)}",
        )


@router.get(
    "/project/{uuid}",
    status_code=status.HTTP_200_OK,
    response_model=ProjectRead,
    tags=["Project"],
)
async def get_project(uuid: UUID, db_ctx: DBContext = Depends(get_db_ctx)):
    projects = create_project_service(db_ctx)
    try:
        project = await projects.fetch_by_uuid(uuid)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
            )
        return project
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch project: {str(e)}",
        )


@router.post(
    "/project/{uuid}/estimate",
    status_code=status.HTTP_200_OK,
    response_model=TokenEstimation,
    tags=["Project"],
)
async def estimate_tokens(
    uuid: UUID,
    request_data: TokenEstimationRequest,
    db_ctx: DBContext = Depends(get_db_ctx),
):
    project_service = create_project_service(db_ctx)
    paper_service = create_paper_service(db_ctx)
    token_estimation_service = create_token_estimation_service()
    try:
        project = await project_service.fetch_by_uuid(uuid)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
            )

        papers = await paper_service.fetch_papers(project_uuid=uuid)
        if not papers:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Papers not found"
            )

        if request_data.screening_type == JobPromptingType.ZERO_SHOT:
            return token_estimation_service.estimate_tokens(
                papers=papers, criteria=project.criteria
            )
        elif request_data.screening_type == JobPromptingType.FEW_SHOT:
            max_seed_paper_amount = await paper_service.count_papers_with_human_result(
                project_uuid=uuid
            )
            return token_estimation_service.estimate_tokens(
                papers=papers,
                criteria=project.criteria,
                prompt_type=JobPromptingType.FEW_SHOT,
                seed_paper_count=max_seed_paper_amount,
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Screening type {request_data.screening_type} is not supported",
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to estimate tokens: {str(e)}",
        )


@router.post("/project", status_code=status.HTTP_201_CREATED, tags=["Project"])
async def create_new_project(
    project_data: ProjectCreate, db_ctx: DBContext = Depends(get_db_ctx)
):
    projects = create_project_service(db_ctx)
    try:
        new_id, new_uuid = await projects.create(project_data)
        await db_ctx.commit()
        await push_event(
            QueueItem(event_name=EventName.PROJECT_CREATED, value={"uuid": new_uuid})
        )
        return {"id": new_id, "uuid": str(new_uuid)}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Project creation failed: {str(e)}",
        )


@router.delete("/project/{uuid}", status_code=status.HTTP_200_OK, tags=["Project"])
async def delete_project(uuid: UUID, db_ctx: DBContext = Depends(get_db_ctx)):
    projects = create_project_service(db_ctx)
    try:
        deleted = await projects.delete(uuid)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Project not found"
            )
        await db_ctx.commit()
        return {"detail": "Project deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete project: {str(e)}",
        )
