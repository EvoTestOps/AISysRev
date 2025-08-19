from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from src.services.file_service import FileService, get_file_service
from src.services.paper_service import PaperService, get_paper_service

router = APIRouter()


@router.get("/paper/{project_uuid}", status_code=status.HTTP_200_OK)
async def get_papers(
    project_uuid: UUID, papers: PaperService = Depends(get_paper_service)
):
    try:
        papers = await papers.fetch_papers(project_uuid)
        return papers
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch papers: {str(e)}",
        ) from e
