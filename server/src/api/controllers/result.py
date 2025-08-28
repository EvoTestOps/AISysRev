from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Response
from src.services.result_service import ResultService, get_result_service


router = APIRouter()


@router.get("/result/download_result_csv", status_code=200)
async def download_result_csv(
    project_uuid: UUID,
    result_service: ResultService = Depends(get_result_service),
):
    try:
        csv_content = await result_service.generate_result_csv(project_uuid)
        filename = f"project_{project_uuid}_results.csv"
        return Response(
            content=csv_content,
            media_type="text/csv; charset=utf-8",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate CSV: {str(e)}",
        )

@router.get("/result/", status_code=200)
async def get_result(
    project_uuid: UUID,
    result_service: ResultService = Depends(get_result_service),
):
    try:
        return await result_service.fetch_result(project_uuid)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch result: {str(e)}",
        )