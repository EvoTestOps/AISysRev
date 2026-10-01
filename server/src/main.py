import re
from contextlib import asynccontextmanager

import uvicorn
from fastapi import APIRouter, FastAPI, Request
from fastapi.logger import logger
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware

from src.api.controllers.auth import router as auth_router
from src.api.controllers.e2e_support import router as e2e_support_router
from src.api.controllers.event_queue import router as event_queue_router
from src.api.controllers.file import router as file_router
from src.api.controllers.fixture import router as fixture_router
from src.api.controllers.health_check import router as health_check_router
from src.api.controllers.job import router as job_router
from src.api.controllers.jobtask import router as jobtask_router
from src.api.controllers.llm import router as llm_router
from src.api.controllers.paper import router as paper_router
from src.api.controllers.project import router as project_router
from src.api.controllers.result import router as result_router
from src.api.controllers.setting import router as setting_router
from src.core.config import settings
from src.core.readiness import startup_complete
from src.redis_client.client import close_shared_redis_client
from src.tools.diagnostics.celery_check import router as celery_test_router
from src.tools.diagnostics.db_check import check_database_connection, wait_for_db
from src.tools.diagnostics.redis_check import check_redis_connection
from src.tools.diagnostics.storage_check import check_storage_backend


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"Starting AISysRev version {settings.APP_VERSION}")

    print("Waiting for database connection...")
    await wait_for_db()

    print("Checking database connection...")
    await check_database_connection()

    print("Checking Redis connection...")
    await check_redis_connection()

    print("Checking storage backend...")
    await check_storage_backend()

    print("Application startup complete!")
    startup_complete.set()

    yield

    await close_shared_redis_client()


app = FastAPI(
    lifespan=lifespan,
    title="AISysRev",
    summary="Research-based title-abstract screening tool.",
    version=settings.APP_VERSION,
    terms_of_service="/terms-and-conditions",
    license_info={
        "name": "MIT License",
        "url": "https://github.com/EvoTestOps/AISysRev/blob/main/LICENSE",
    },
    contact={"name": "EvoTestOps", "url": "https://github.com/EvoTestOps"},
)

app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)

templates = Jinja2Templates(directory="templates")

v1_router = APIRouter(prefix="/api/v1")

if settings.APP_ENV == "test":
    v1_router.include_router(fixture_router)
    # Must come before the project/paper/file routers so that e.g.
    # DELETE /project/batch isn't matched by DELETE /project/{uuid}
    v1_router.include_router(e2e_support_router)

if settings.APP_ENV in ("dev", "test"):
    v1_router.include_router(celery_test_router)

v1_router.include_router(health_check_router)
v1_router.include_router(project_router)
v1_router.include_router(file_router)
v1_router.include_router(job_router)
v1_router.include_router(jobtask_router)
v1_router.include_router(paper_router)
v1_router.include_router(setting_router)
v1_router.include_router(llm_router)
v1_router.include_router(result_router)
v1_router.include_router(event_queue_router)
v1_router.include_router(auth_router)

app.include_router(v1_router)


@app.get("/register-and-privacy-policy")
async def privacy_policy_page():
    return FileResponse(
        "static/register-and-privacy-policy.pdf", media_type="application/pdf"
    )


@app.get("/terms-and-conditions")
async def terms_and_conditions_page():
    return FileResponse("static/terms-and-conditions.pdf", media_type="application/pdf")


@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse(
        request,
        "login.html",
        {
            "show_dev_login": settings.APP_ENV in ("dev", "test"),
            "app_version": settings.APP_VERSION,
            # Staging builds use the full commit SHA; show it in short form
            "app_version_short": settings.APP_VERSION[:7]
            if re.fullmatch(r"[0-9a-f]{40}", settings.APP_VERSION)
            else settings.APP_VERSION,
        },
    )


if __name__ == "__main__":
    logger.info("Starting uvicorn server")
    uvicorn.run("main:app", port=8080, host="0.0.0.0", reload=True, access_log=True)
