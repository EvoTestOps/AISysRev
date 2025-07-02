from multiprocessing.pool import AsyncResult
from fastapi import APIRouter, HTTPException
from tasks.example import test_task
from worker import celery_app
from celery.result import AsyncResult

router = APIRouter()

@router.get("/api/v1/health")
def health_check():
    return {"status": "ok"}

@router.post("/run-test-task")
async def run_test_task():
    result = test_task.delay("Hello from FastAPI")
    return {"task_id": result.id}

@router.get("/task-status/{task_id}")
async def get_task_status(task_id: str):
    try:
        task_result = AsyncResult(task_id, app=celery_app)

        if not task_result:
            raise HTTPException(status_code=404, detail="Task not found")

        response = {
            "task_id": task_id,
            "state": task_result.state,
            "result": None,
        }

        if task_result.state == "SUCCESS":
            response["result"] = task_result.result
        elif task_result.state == "FAILURE":
            response["result"] = str(task_result.info)

        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
