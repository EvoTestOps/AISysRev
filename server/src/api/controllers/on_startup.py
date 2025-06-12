from fastapi import APIRouter
from db.db_check import check_database_connection

router = APIRouter()

@router.on_event("startup")
async def on_startup():
    print("on_startup hook called")
    await check_database_connection()