from fastapi import APIRouter
from celery.result import AsyncResult
from tasks.example import test_task

router = APIRouter()

@router.get("/api/v1/health")
def health_check():
    return {"status": "ok"}

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
