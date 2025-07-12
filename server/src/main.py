import uvicorn
import os
from fastapi import FastAPI
from src.api.controllers import health_check, on_startup, fixture, project, file, job

app = FastAPI()

if os.getenv("TEST_MODE", False):
    app.include_router(fixture.router)

app.include_router(on_startup.router)
app.include_router(health_check.router)
app.include_router(file.router)
app.include_router(project.router)
app.include_router(job.router)

if __name__ == "__main__":
    uvicorn.run("main:app", port=8080, host="0.0.0.0", reload=True)
