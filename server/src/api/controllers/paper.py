from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.exc import IntegrityError

from src.core.auth import get_current_user
from src.db.db_context import DBContext, get_db_ctx
from src.db.models.user import User
from src.schemas.paper import PaperCreate, PaperHumanResultUpdate, PaperRead
from src.services.paper_service import create_paper_service

router = APIRouter()


@router.post(
    "/paper/batch",
    status_code=status.HTTP_201_CREATED,
    response_model=list[PaperRead],
    tags=["Paper"],
)
async def create_papers_batch(
    request_data: list[PaperCreate],
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    papers = create_paper_service(db_ctx)
    try:
        created = await papers.create_batch(request_data, current_user.uuid)
        await db_ctx.commit()
        return created
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except IntegrityError as ie:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid paper data: {ie}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch paper creation failed: {str(e)}",
        )


@router.delete("/paper/batch", status_code=status.HTTP_200_OK, tags=["Paper"])
async def delete_papers_batch(
    uuids: list[UUID],
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    papers = create_paper_service(db_ctx)
    try:
        deleted = await papers.delete_batch(uuids, current_user.uuid)
        await db_ctx.commit()
        return {"deleted": [str(u) for u in deleted]}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to batch delete papers: {str(e)}",
        )


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
        return await papers.fetch_papers_with_model_evals(
            project_uuid, current_user.uuid
        )
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
        ris_content = await papers.generate_missing_fulltext_ris(
            project_uuid, current_user.uuid
        )
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
