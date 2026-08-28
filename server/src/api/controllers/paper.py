from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status

from src.core.auth import get_current_user
from src.db.db_context import DBContext, get_db_ctx
from src.db.models.user import User
from src.schemas.paper import PaperHumanResultUpdate
from src.services.paper_service import create_paper_service


router = APIRouter()


@router.get("/paper/{project_uuid}", status_code=status.HTTP_200_OK, tags=["Paper"])
async def get_papers(
    project_uuid: UUID,
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    papers = create_paper_service(db_ctx)
    try:
        return await papers.fetch_papers(project_uuid, current_user.uuid)
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
    try:
        return await papers.fetch_papers_with_model_evals(project_uuid, current_user.uuid)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch papers: {str(e)}",
        ) from e


@router.get(
    "/paper/{project_uuid}/missing_fulltext_ris",
    status_code=status.HTTP_200_OK,
    tags=["Paper"],
)
async def download_missing_fulltext_ris(
    project_uuid: UUID,
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    papers = create_paper_service(db_ctx)
    try:
        ris_content = await papers.generate_missing_fulltext_ris(project_uuid, current_user.uuid)
        filename = f"project_{project_uuid}_missing_fulltext.ris"
        return Response(
            content=ris_content,
            media_type="application/x-research-info-systems",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate RIS: {str(e)}",
        ) from e


@router.patch("/paper/{uuid}", status_code=status.HTTP_200_OK, tags=["Paper"])
async def add_paper_human_result(
    uuid: UUID,
    result: PaperHumanResultUpdate,
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    papers = create_paper_service(db_ctx)
    try:
        await papers.add_human_result(uuid, current_user.uuid, result.human_result)
        await db_ctx.commit()
        return {"detail": "Human result to paper added successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add human result to paper: {str(e)}",
        )
