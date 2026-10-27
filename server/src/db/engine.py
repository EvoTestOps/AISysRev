import logging
import os

from sqlalchemy import NullPool
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from src.core.config import settings

logging.basicConfig()
logging.getLogger("sqlalchemy.engine").setLevel(
    logging.DEBUG if os.getenv("DB_ECHO", "false").lower() == "true" else logging.WARNING
)

DB_URL = settings.DB_URL
if not DB_URL:
    raise ValueError("Environment variable DB_URL is not set")

db_echo = os.getenv("DB_ECHO", "false").lower() == "true"

# No connection pool by default: an asyncpg connection only works in the event
# loop that opened it, and Celery runs every job in a new event loop
# (asyncio.run), as do the tests. The API, which runs in a single event loop,
# switches to create_pooled_engine() in its lifespan (see src/db/session.py).
engine = create_async_engine(DB_URL, echo=db_echo, poolclass=NullPool)


def create_pooled_engine() -> AsyncEngine:
    return create_async_engine(
        DB_URL,
        echo=db_echo,
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_POOL_MAX_OVERFLOW,
        # Replace connections that were closed while idle in the pool (e.g. by a database restart)
        pool_pre_ping=True,
    )
