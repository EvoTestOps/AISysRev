import asyncio

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from src.core.readiness import startup_complete
from src.tools.diagnostics.celery_check import check_celery_worker
from src.tools.diagnostics.db_check import check_database_connection
from src.tools.diagnostics.redis_check import check_redis_connection

router = APIRouter()


READINESS_CHECKS = ("db", "redis")

@router.get("/health/live", include_in_schema=False)
async def liveness():
    return {"status": "ok"}


@router.get("/health", tags=["Health check"])
async def health_check():
    if not startup_complete.is_set():
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "starting",
                "reason": "FastAPI lifespan not completed",
            },
        )

    outcomes = await asyncio.gather(
        check_database_connection(),
        check_redis_connection(),
        check_celery_worker(),
        return_exceptions=True,
    )

    results = {
        name: f"error: {outcome}" if isinstance(outcome, BaseException) else "ok"
        for name, outcome in zip(("db", "redis", "celery"), outcomes)
    }

    is_healthy = all(results[name] == "ok" for name in READINESS_CHECKS)

    payload = {
        "status": "ok" if is_healthy else "error",
        **results,
    }

    return JSONResponse(
        status_code=(
            status.HTTP_200_OK if is_healthy else status.HTTP_503_SERVICE_UNAVAILABLE
        ),
        content=payload,
    )
