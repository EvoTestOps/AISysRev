import traceback

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from src.core.config import settings
from src.db.engine import engine
from src.db.models.job import Job
from src.db.session import Base
from src.worker import celery_app

router = APIRouter()


@router.post("/fixtures/reset", tags=["Fixture"])
async def reset_fixtures():
    try:
        if settings.APP_ENV != "test":
            # Lets return HTTP 404 so it behaves like a non-existing route
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

        # Revoke every job's tracked Celery task before wiping the DB, rather
        # than discovering in-flight tasks via control.inspect() -- that's a
        # broadcast request/reply round trip over the broker connection that
        # can hang if the long-lived pooled connection has gone stale.
        async with engine.connect() as conn:
            result = await conn.execute(
                select(Job.celery_task_id).where(Job.celery_task_id.is_not(None))
            )
            task_ids = [row[0] for row in result]

        celery_app.control.purge()
        for task_id in task_ids:
            celery_app.control.revoke(str(task_id), terminate=True)

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as e:
        print("Exception in /fixtures/reset:", e)
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch job: {str(e)}",
        )
