import asyncio
import logging
import os

from alembic import command
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from src.core.config import settings
from src.db.session import AsyncSessionLocal

logger = logging.getLogger(__name__)


async def check_database_connection():
    try:
        # A session, not the engine, so that the API's health check uses its connection pool
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("SELECT 1"))
            res = result.fetchall()
            logger.info("Database check successful.")
            return res
    except SQLAlchemyError as e:
        logger.error("Database connection failed: %s", e)
        raise


async def check_max_connections() -> int | None:
    """Log PostgreSQL's max_connections next to this API process's pool limit.

    Only informational, so a failure doesn't stop the startup.
    """
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("SHOW max_connections"))
            max_connections = int(result.scalar_one())
    except SQLAlchemyError as e:
        logger.warning("Could not read max_connections: %s", e)
        return None

    pool_limit = settings.DB_POOL_SIZE + settings.DB_POOL_MAX_OVERFLOW
    logger.info(
        "PostgreSQL max_connections: %s (this API process pools up to %s)",
        max_connections,
        pool_limit,
    )
    if pool_limit >= max_connections:
        logger.warning(
            "DB_POOL_SIZE + DB_POOL_MAX_OVERFLOW is not below max_connections, "
            "so the API alone can use up every database connection"
        )
    return max_connections


async def wait_for_db():
    max_retries = 5
    for i in range(max_retries):
        try:
            await check_database_connection()
            logger.info("Database is ready!")
            return
        except Exception as e:
            logger.warning(
                "Database not ready (attempt %s/%s): %s", i + 1, max_retries, e
            )
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
        logger.error("Error during migration: %s", e)
        raise
