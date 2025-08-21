from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from src.services.paper_service import PaperService, get_paper_service
from src.schemas.paper import PaperHumanResultUpdate


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

@router.patch("/paper/{uuid}", status_code=status.HTTP_200_OK)
async def add_paper_human_result(
    uuid: UUID,
    result: PaperHumanResultUpdate,
    papers: PaperService = Depends(get_paper_service)
):
    try:
        await papers.add_human_result(uuid, result.human_result)
        return {"detail": "Human result to paper added successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to add human result to paper: {str(e)}")