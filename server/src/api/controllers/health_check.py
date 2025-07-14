import os
import redis.asyncio as redis
from fastapi import APIRouter
from celery.result import AsyncResult
from src.core.config import settings
from src.worker import celery_app
from src.tasks.example import test_task
from src.db.db_check import check_database_connection

router = APIRouter()

@router.get("/api/v1/health")
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

async def check_redis_connection():
    redis_url = settings.REDIS_URL
    client = redis.from_url(redis_url)
    try:
        pong = await client.ping()
        if pong:
            print("Redis connection OK")
        else:
            raise ConnectionError("Redis ping failed")
    except Exception as e:
        print(f"Redis connection failed: {e}")
        raise
    finally:
        await client.close()

async def check_celery_worker():
    try:
        res = celery_app.control.ping(timeout=2)
        if res and isinstance(res, list) and len(res) > 0:
            print("Celery worker connection OK")
        else:
            raise ConnectionError("No Celery workers responded")
    except Exception as e:
        print(f"Celery worker connection failed: {e}")
        raise

@router.post("/run-test-task")
async def run_test_task():
    task = test_task.delay("This is FastAPI")
    return {"task_id": task.id}

@router.get("/task-status/{task_id}")
async def get_task_status(task_id: str):
    task_result = AsyncResult(task_id, app=test_task.app)
    if not task_result:
        return {"error": "Task not found"}
    response = {
        "task_id": task_id,
        "state": task_result.state,
        "result": task_result.result if task_result.state == "SUCCESS" else None,
    }
    return response
