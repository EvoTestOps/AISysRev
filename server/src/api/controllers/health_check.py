from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from src.core.readiness import startup_complete
from src.tools.diagnostics.celery_check import check_celery_worker
from src.tools.diagnostics.db_check import check_database_connection
from src.tools.diagnostics.redis_check import check_redis_connection

router = APIRouter()


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

    results = {
        "db": "ok",
        "redis": "ok",
        "celery": "ok",
    }

    try:
        await check_database_connection()
    except Exception as e:
        results["db"] = f"error: {e}"

    try:
        await check_redis_connection()
    except Exception as e:
        results["redis"] = f"error: {e}"

    try:
        await check_celery_worker()
    except Exception as e:
        results["celery"] = f"error: {e}"

    is_healthy = all(v == "ok" for v in results.values())

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
