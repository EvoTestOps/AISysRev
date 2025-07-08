import os
import asyncio
import redis.asyncio as redis
from fastapi import APIRouter
from alembic import command
from alembic.config import Config
from src.db.db_check import check_database_connection

router = APIRouter()

async def run_migration():
    alembic_cfg = Config(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'alembic.ini'))
    loop = asyncio.get_running_loop()
    try:
        await loop.run_in_executor(None, command.upgrade, alembic_cfg, "head")
    except Exception as e:
        print(f"Error during migration: {e}")
        raise


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
    await run_migration()
    await check_database_connection()
    await check_redis_connection()
