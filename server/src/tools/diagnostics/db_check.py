import os
import asyncio
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.engine.url import make_url
from alembic import command
from alembic.config import Config
from src.db.engine import engine

url = make_url(engine.url)
print(f"Dialect: {url.get_dialect().__module__}")

async def check_database_connection():
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT * FROM pg_database"))
            result.fetchall()
            print("Database check successful.")
    except SQLAlchemyError as e:
        print(f"Database connection failed: {e}")

async def wait_for_db():
    max_retries = 7
    for i in range(max_retries):
        try:
            await check_database_connection()
            print("Database is ready!")
            return
        except Exception as e:
            print(f"Database not ready (attempt {i+1}/{max_retries}): {e}")
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