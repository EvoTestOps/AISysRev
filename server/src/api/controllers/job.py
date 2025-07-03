from fastapi import APIRouter

router = APIRouter(prefix="/api")

@router.get("/job/{uuid}", status_code=200)
async def get_single_job(uuid: str):
    return await jobs.fetch_by_uuid(uuid)

@router.get("/job", status_code=200)
async def get_jobs():
    return await jobs.fetch_all()

