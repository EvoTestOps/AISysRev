from fastapi import APIRouter
from celery.result import AsyncResult
from src.core.config import settings
from src.worker import celery_app
from src.celery.tasks import test_task

router = APIRouter()


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
