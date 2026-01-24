from contextlib import asynccontextmanager
import uvicorn
import asyncio
from fastapi import FastAPI, APIRouter
from fastapi.logger import logger
from src.core.config import settings
from src.core.readiness import startup_complete
from src.api.controllers.fixture import router as fixture_router
from src.api.controllers.health_check import router as health_check_router
from src.api.controllers.project import router as project_router
from src.api.controllers.file import router as file_router
from src.api.controllers.job import router as job_router
from src.api.controllers.llm import router as llm_router
from src.api.controllers.jobtask import router as jobtask_router
from src.api.controllers.paper import router as paper_router
from src.api.controllers.setting import router as setting_router
from src.api.controllers.result import router as result_router
from src.api.controllers.event_queue import router as event_queue_router
from src.tools.diagnostics.celery_check import router as celery_test_router
from src.redis_client.client import redis_subscribe
from src.tools.minio_client import check_and_create_s3_bucket
from src.tools.diagnostics.redis_check import check_redis_connection
from src.tools.diagnostics.db_check import check_database_connection, wait_for_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Waiting for database connection...")
    await wait_for_db()

    print("Checking database connection...")
    await check_database_connection()

    print("Checking Redis connection...")
    await check_redis_connection()

    print("Checking S3 bucket...")
    check_and_create_s3_bucket()

    print("Subscribing to Redis topics..")
    redis_task: asyncio.Task = asyncio.create_task(
        redis_subscribe(), name="redis_subscription"
    )
    print(f"Redis subscriber task created: {redis_task!r}")

    print("Application startup complete!")
    startup_complete.set()

    yield

    if redis_task:
        redis_task.cancel()


app = FastAPI(
    lifespan=lifespan,
    title="AISysRev",
    summary="Research-based title-abstract screening tool.",
    version="1.0.0",
    terms_of_service="/terms-and-conditions",
    license_info={
        "name": "MIT License",
        "url": "https://github.com/EvoTestOps/AISysRev/blob/main/LICENSE",
    },
    contact={"name": "EvoTestOps", "url": "https://github.com/EvoTestOps"},
)

v1_router = APIRouter(prefix="/api/v1")

if settings.APP_ENV == "test":
    v1_router.include_router(fixture_router)

v1_router.include_router(health_check_router)
v1_router.include_router(project_router)
v1_router.include_router(file_router)
v1_router.include_router(job_router)
v1_router.include_router(jobtask_router)
v1_router.include_router(paper_router)
v1_router.include_router(setting_router)
v1_router.include_router(celery_test_router)
v1_router.include_router(llm_router)
v1_router.include_router(result_router)
v1_router.include_router(event_queue_router)

app.include_router(v1_router)

if __name__ == "__main__":
    logger.info("Starting uvicorn server")
    uvicorn.run("main:app", port=8080, host="0.0.0.0", reload=True, access_log=True)
