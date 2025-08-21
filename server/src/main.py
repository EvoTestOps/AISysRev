import uvicorn
import logging
from fastapi import FastAPI, APIRouter
from fastapi.logger import logger
from src.core.config import settings
from src.api.controllers.fixture import router as fixture_router
from src.api.controllers.on_startup import router as on_startup_router
from src.api.controllers.health_check import router as health_check_router
from src.api.controllers.project import router as project_router
from src.api.controllers.file import router as file_router
from src.api.controllers.job import router as job_router
from src.api.controllers.openrouter import router as openrouter_router
from src.api.controllers.jobtask import router as jobtask_router
from src.api.controllers.paper import router as paper_router
from src.api.controllers.setting import router as setting_router
from src.tools.diagnostics.celery_check import router as celery_test_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()
v1_router = APIRouter(prefix="/api/v1")

if settings.APP_ENV == "test":
    v1_router.include_router(fixture_router)

v1_router.include_router(on_startup_router)
v1_router.include_router(health_check_router)
v1_router.include_router(project_router)
v1_router.include_router(file_router)
v1_router.include_router(job_router)
v1_router.include_router(jobtask_router)
v1_router.include_router(paper_router)
v1_router.include_router(setting_router)
v1_router.include_router(celery_test_router)
v1_router.include_router(openrouter_router)

app.include_router(v1_router)

if __name__ == "__main__":
    logger.info("Starting uvicorn server")
    uvicorn.run("main:app", port=8080, host="0.0.0.0", reload=True, access_log=True)
