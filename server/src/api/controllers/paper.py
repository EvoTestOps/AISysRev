from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from src.core.auth import get_current_user
from src.db.db_context import DBContext, get_db_ctx
from src.db.models.user import User
from src.schemas.paper import PaperHumanResultUpdate
from src.services.paper_service import create_paper_service
from src.services.project_service import create_project_service


router = APIRouter()


@router.get("/paper/{project_uuid}", status_code=status.HTTP_200_OK, tags=["Paper"])
async def get_papers(
    project_uuid: UUID,
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    papers = create_paper_service(db_ctx)
    project_service = create_project_service(db_ctx)
    try:
        project = await project_service.fetch_by_uuid(project_uuid, owner_uuid=current_user.uuid)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
            )
        return await papers.fetch_papers(project_uuid)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch papers: {str(e)}",
        ) from e


@router.get(
    "/paper/{project_uuid}/with_model_evaluations",
    status_code=status.HTTP_200_OK,
    tags=["Paper"],
)
async def get_project_papers_with_model_evals(
    project_uuid: UUID,
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    papers = create_paper_service(db_ctx)
    project_service = create_project_service(db_ctx)
    try:
        project = await project_service.fetch_by_uuid(project_uuid, owner_uuid=current_user.uuid)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
            )
        return await papers.fetch_papers_with_model_evals(project_uuid)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch papers: {str(e)}",
        ) from e


@router.patch("/paper/{uuid}", status_code=status.HTTP_200_OK, tags=["Paper"])
async def add_paper_human_result(
    uuid: UUID,
    result: PaperHumanResultUpdate,
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    papers = create_paper_service(db_ctx)
    project_service = create_project_service(db_ctx)
    try:
        paper = await papers.fetch_by_uuid(uuid)
        if not paper:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found"
            )
        project = await project_service.fetch_by_uuid(
            paper.project_uuid, owner_uuid=current_user.uuid
        )
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found"
            )
        await papers.add_human_result(uuid, result.human_result)
        await db_ctx.commit()
        return {"detail": "Human result to paper added successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add human result to paper: {str(e)}",
        )
