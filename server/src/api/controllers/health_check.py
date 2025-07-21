from fastapi import APIRouter
from src.tools.diagnostics.db_check import check_database_connection
from src.tools.diagnostics.redis_check import check_redis_connection
from src.tools.diagnostics.celery_check import check_celery_worker

router = APIRouter()

@router.get("/health")
async def health_check():
    db_status = "ok"
    redis_status = "ok"
    celery_status = "ok"
    try:
        await check_database_connection()
    except Exception as e:
        db_status = f"error: {str(e)}"
    try:
        await check_redis_connection()
    except Exception as e:
        redis_status = f"error: {str(e)}"
    try:
        await check_celery_worker()
    except Exception as e:
        celery_status = f"error: {str(e)}"
    return {
        "status": "ok" if db_status == "ok"
            and redis_status == "ok" 
            and celery_status == "ok"
            else "error",
        "db": db_status,
        "redis": redis_status,
        "celery": celery_status,
    }
