import uvicorn
import dotenv
import os
from fastapi import FastAPI, UploadFile, File
from typing import List

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

@app.post("/api/process-csv")
async def process_csv(files: List[UploadFile] = File(...)):
    filenames = [file.filename for file in files]
    return {"status": "received", "filenames": filenames}

if __name__ == "__main__":
    uvicorn.run("main:app", port=8080, host="0.0.0.0", reload=True)
