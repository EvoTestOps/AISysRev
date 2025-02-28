import uvicorn
import dotenv
import os
from fastapi import FastAPI

dotenv.load_dotenv()

# to get a string like this run:
# openssl rand -hex 32
SECRET_KEY = os.environ["SECRET_KEY"]
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

app = FastAPI()


@app.on_event("startup")
def on_startup():
    print("on_startup hook called")


@app.get("/api/v1/health")
def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run("main:app", port=8080, host="0.0.0.0", reload=True)
