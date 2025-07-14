from fastapi import APIRouter, HTTPException, status
import os
from src.db.engine import engine
from src.db.session import Base

router = APIRouter()


@router.post("/fixtures/reset")
async def reset_fixtures():
    try:
        test_mode = os.getenv("TEST_MODE", False)
        if not test_mode:
            # Lets return HTTP 404 so it behaves like a non-existing route
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch job: {str(e)}",
        )
