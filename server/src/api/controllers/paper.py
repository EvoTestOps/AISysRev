from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from src.db.db_context import DBContext, get_db_ctx
from src.schemas.paper import PaperHumanResultUpdate
from src.services.paper_service import create_paper_service

router = APIRouter()


@router.get("/paper/{project_uuid}", status_code=status.HTTP_200_OK)
async def get_papers(project_uuid: UUID, db_ctx: DBContext = Depends(get_db_ctx)):
    papers = create_paper_service(db_ctx)
    try:
        p = await papers.fetch_papers(project_uuid)
        return p
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch papers: {str(e)}",
        ) from e


@router.get(
    "/paper/{project_uuid}/with_model_evaluations", status_code=status.HTTP_200_OK
)
async def get_papers_with_model_evals(
    project_uuid: UUID, db_ctx: DBContext = Depends(get_db_ctx)
):
    papers = create_paper_service(db_ctx)
    try:
        p = await papers.fetch_papers_with_model_evals(project_uuid)
        return p
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch papers: {str(e)}",
        ) from e


@router.patch("/paper/{uuid}", status_code=status.HTTP_200_OK)
async def add_paper_human_result(
    uuid: UUID, result: PaperHumanResultUpdate, db_ctx: DBContext = Depends(get_db_ctx)
):
    papers = create_paper_service(db_ctx)
    try:
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

