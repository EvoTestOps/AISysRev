import asyncio
from fastapi import APIRouter
from src.redis.client import redis_subscribe
from src.tools.minio_client import check_and_create_s3_bucket
from src.tools.diagnostics.redis_check import check_redis_connection
from src.tools.diagnostics.db_check import (
    check_database_connection,
    wait_for_db,
    run_migration,
)

router = APIRouter()

redis_task: asyncio.Task | None = None


@router.on_event("startup")
async def on_startup():
    # print("on_startup hook called")
    # print(f"DB_URL: {settings.DB_URL}")

    try:
        await wait_for_db()

        print("Checking database connection...")
        await check_database_connection()

        print("Starting migration...")
        await run_migration()
        print("Migration complete!")

        print("Checking Redis connection...")
        await check_redis_connection()

        print("Checking S3 bucket...")
        check_and_create_s3_bucket()

        print("Subscribing to Redis topics..")

        global redis_task
        redis_task = asyncio.create_task(redis_subscribe(), name="redis_subscription")
        print(f"Redis subscriber task created: {redis_task!r}")

        print("Application startup complete!")

    except Exception as e:
        print(f"Startup failed: {e}")
        raise


@router.on_event("shutdown")
async def shutdown():
    global redis_task
    if redis_task:
        redis_task.cancel()
        redis_task = None
