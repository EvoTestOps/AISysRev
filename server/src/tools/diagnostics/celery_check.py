import asyncio
import logging

from celery.result import AsyncResult
from fastapi import APIRouter

from src.celery.tasks import test_task
from src.worker import celery_app

router = APIRouter()

logger = logging.getLogger(__name__)


async def check_celery_worker():
    try:
        # ping() blocks for up to the timeout; keep it off the event loop
        res = await asyncio.to_thread(celery_app.control.ping, timeout=2)
        if res and isinstance(res, list) and len(res) > 0:
            logger.info("Celery worker connection OK")
        else:
            raise ConnectionError("No Celery workers responded")
    except Exception as e:
        logger.error("Celery worker connection failed: %s", e)
        raise


@router.post("/run-test-task", tags=["Celery"])
async def run_test_task():
    task = test_task.delay("This is FastAPI")
    return {"task_id": task.id}


@router.get("/task-status/{task_id}", tags=["Celery"])
async def get_task_status(task_id: str):
    task_result: AsyncResult = AsyncResult(task_id, app=test_task.app)
    if not task_result:
        return {"error": "Task not found"}
    response = {
        "task_id": task_id,
        "state": task_result.state,
        "result": task_result.result if task_result.state == "SUCCESS" else None,
    }
    return response
