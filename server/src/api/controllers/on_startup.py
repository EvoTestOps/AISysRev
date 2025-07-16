import os
import asyncio
from fastapi import APIRouter
from alembic import command
from alembic.config import Config
from src.core.config import settings
from src.db.db_check import check_database_connection
from src.api.controllers.health_check import check_redis_connection

router = APIRouter()

async def run_migration():
    alembic_cfg = Config(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'alembic.ini'))
    loop = asyncio.get_running_loop()
    try:
        await loop.run_in_executor(None, command.upgrade, alembic_cfg, "head")
    except Exception as e:
        print(f"Error during migration: {e}")
        raise

@router.on_event("startup")
async def on_startup():
    print("on_startup hook called")
    print(f"DB_URL: {settings.DB_URL}")

    try:
        await wait_for_db()
        print("Starting migration...")
        await run_migration()
        print("Migration complete!")

        print("Checking database connection...")
        await check_database_connection()

        print("Checking Redis connection...")
        await check_redis_connection()

        print("Application startup complete!")
    except Exception as e:
        print(f"Startup failed: {e}")
        raise

