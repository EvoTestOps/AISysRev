import uvicorn
from fastapi import FastAPI
from src.api.controllers import health_check, on_startup, project, file

app = FastAPI()

app.include_router(on_startup.router)
app.include_router(health_check.router)
app.include_router(file.router)
app.include_router(project.router)

if __name__ == "__main__":
    uvicorn.run("main:app", port=8080, host="0.0.0.0", reload=True)
