from uuid import UUID
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import HTMLResponse

from src.core.auth import get_current_user
from src.db.db_context import DBContext, get_db_ctx
from src.db.models.user import User
from src.services.jobtask_service import create_jobtask_service
from src.services.project_service import create_project_service
from src.services.result_service import create_result_service

router = APIRouter()


@router.get("/result/download_result_csv", status_code=200, tags=["Results"])
async def download_result_csv(
    project_uuid: UUID,
    screening_target: Literal["PAPER", "GITHUB_REPOSITORY"],
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    result_service = create_result_service(db_ctx)

    try:
        csv_content = await result_service.generate_result_csv(project_uuid, current_user.uuid, screening_target)
        filename = f"project_{project_uuid}_results.csv"
        return Response(
            content=csv_content,
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate CSV: {str(e)}",
        )


@router.get("/result/html", status_code=200, tags=["Results"])
async def download_result_html(
    project_uuid: UUID,
    screening_target: Literal["PAPER", "GITHUB_REPOSITORY"],
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    result_service = create_result_service(db_ctx)

    try:
        content = await result_service.generate_html(project_uuid, current_user.uuid, screening_target)
        return HTMLResponse(
            content=f"""
<html>
    <head>
        <title>Viewing results for Project {project_uuid}</title>
        <style>
  table, th, td {{font-size:10pt; border:1px solid black; border-collapse:collapse; text-align:left;}}
  th, td {{padding: 5px;}}
</style>
    </head>
    <body>
        {content}
    </body>
</html>
    """
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to show HTML: {str(e)}",
        )


@router.get("/result/per_criteria_stats", status_code=200, tags=["Results"])
async def get_per_criteria_stats(
    project_uuid: UUID,
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    project_service = create_project_service(db_ctx)
    project = await project_service.fetch_by_uuid(project_uuid, owner_uuid=current_user.uuid)
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )
    try:
        jobtask_service = create_jobtask_service(db_ctx)
        return await jobtask_service.compute_per_criteria_agreement(
            project_uuid, project.criteria, current_user.uuid,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch per-criteria stats: {str(e)}",
        )


@router.get("/result/", status_code=200, tags=["Results"])
async def get_result(
    project_uuid: UUID,
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    result_service = create_result_service(db_ctx)
    try:
        return await result_service.fetch_result(project_uuid, current_user.uuid)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch result: {str(e)}",
        )
