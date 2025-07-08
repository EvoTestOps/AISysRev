import os
import redis.asyncio as redis
from fastapi import APIRouter
from src.db.db_check import check_database_connection

router = APIRouter()

async def check_redis_connection():
    redis_url = os.getenv("REDIS_URL")
    client = redis.from_url(redis_url)
    try:
        pong = await client.ping()
        if pong:
            print("Redis connection OK")
        else:
            raise ConnectionError("Redis ping failed")
    except Exception as e:
        print(f"Redis connection failed: {e}")
        raise
    finally:
        await client.close()

@router.on_event("startup")
async def on_startup():
    print("on_startup hook called")
    await check_database_connection()
    await check_redis_connection()
