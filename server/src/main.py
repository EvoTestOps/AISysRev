from contextlib import asynccontextmanager
import uvicorn
from fastapi import FastAPI, APIRouter
from fastapi.logger import logger
from fastapi.responses import FileResponse, HTMLResponse
from starlette.middleware.sessions import SessionMiddleware
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
from src.api.controllers.auth import router as auth_router
from src.api.controllers.result import router as result_router
from src.api.controllers.event_queue import router as event_queue_router
from src.tools.diagnostics.celery_check import router as celery_test_router
from src.tools.diagnostics.redis_check import check_redis_connection
from src.tools.diagnostics.db_check import check_database_connection, wait_for_db
from src.redis_client.client import close_shared_redis_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Waiting for database connection...")
    await wait_for_db()

    print("Checking database connection...")
    await check_database_connection()

    print("Checking Redis connection...")
    await check_redis_connection()

    print("Application startup complete!")
    startup_complete.set()

    yield

    await close_shared_redis_client()


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

app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)

v1_router = APIRouter(prefix="/api/v1")

if settings.APP_ENV == "test":
    v1_router.include_router(fixture_router)

if settings.APP_ENV != "prod":
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

@app.get("/register_and_privacy_policy")
async def privacy_policy_page():
    return FileResponse("static/register-privacy-policy.pdf", media_type="application/pdf")


@app.get("/terms-and-conditions")
async def terms_and_conditions_page():
    return FileResponse("static/terms-and-conditions.pdf", media_type="application/pdf")


@app.get("/login", response_class=HTMLResponse)
async def login_page():
    dev_button = (
        """
        <a href="/api/v1/auth/dev-login" id="dev-btn" class="btn btn-gray">
            Dev Login
        </a>"""
        if settings.APP_ENV != "prod"
        else ""
    )
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AISysRev – Login</title>
  <style>
    *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      min-height: 100vh;
      background: #e5e7eb;
      font-family: Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
    }}
    .card {{
      background: #fff;
      padding: 2.5rem;
      border-radius: 0.5rem;
      box-shadow: 0 4px 24px rgba(0,0,0,0.10);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      max-width: 22rem;
      width: 100%;
    }}
    h1 {{ font-size: 1.5rem; font-weight: 700; color: #111; }}
    .btn {{
      display: inline-block;
      width: 100%;
      padding: 0.5rem 0.75rem;
      border-radius: 0.5rem;
      border: 2px solid;
      font-weight: 600;
      font-size: 1rem;
      text-align: center;
      text-decoration: none;
      transition: background 0.2s;
    }}
    .btn-slate {{ background: #1e293b; border-color: #1e293b; color: #fff; }}
    .btn-slate:hover {{ background: #334155; }}
    .btn-gray {{ background: #6b7280; border-color: #6b7280; color: #fff; }}
    .btn-gray:hover {{ background: #9ca3af; }}
  </style>
</head>
<body>
  <div class="card">
    <h1>AISysRev</h1>
    <a href="/api/v1/auth/login" id="login-btn" class="btn btn-slate">
      Login with University of Helsinki
    </a>
    {dev_button}
  </div>
</body>
</html>"""


if __name__ == "__main__":
    logger.info("Starting uvicorn server")
    uvicorn.run("main:app", port=8080, host="0.0.0.0", reload=True, access_log=True)
