import asyncio
import os

from alembic import command
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from src.db.session import AsyncSessionLocal


async def check_database_connection():
    try:
        # A session, not the engine, so that the API's health check uses its connection pool
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("SELECT 1"))
            res = result.fetchall()
            print("Database check successful.")
            return res
    except SQLAlchemyError as e:
        print(f"Database connection failed: {e}")
        raise


async def wait_for_db():
    max_retries = 5
    for i in range(max_retries):
        try:
            await check_database_connection()
            print("Database is ready!")
            return
        except Exception as e:
            print(f"Database not ready (attempt {i + 1}/{max_retries}): {e}")
            await asyncio.sleep(2**i)
    raise Exception("Database failed to become ready")


async def run_migration():
    alembic_cfg = Config(
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "alembic.ini")
    )
    loop = asyncio.get_running_loop()
    try:
        await loop.run_in_executor(None, command.upgrade, alembic_cfg, "head")
    except Exception as e:
        print(f"Error during migration: {e}")
        raise
