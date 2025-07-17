from fastapi import APIRouter, HTTPException, status
import traceback
from src.core.config import settings
from src.db.engine import engine
from src.db.session import Base

router = APIRouter()


@router.post("/fixtures/reset")
async def reset_fixtures():
    try:
        if settings.APP_ENV != "test":
            # Lets return HTTP 404 so it behaves like a non-existing route
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
        return {"status": "ok"}
    except Exception as e:
        print("Exception in /fixtures/reset:", e)
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch job: {str(e)}",
        )
