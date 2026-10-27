from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

from .engine import create_pooled_engine, engine

Base = declarative_base()

AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


@asynccontextmanager
async def connection_pool() -> AsyncGenerator[None, None]:
    """Route every new session through a connection pool while this is open.

    The API enters this in its lifespan. Without a pool, every request opens a
    new Postgres connection, and the connection setup costs the database more
    than the request's own queries. Only enter it in a process that uses a
    single event loop: Celery workers must stay on the NullPool engine.
    """
    pooled_engine = create_pooled_engine()
    AsyncSessionLocal.configure(bind=pooled_engine)
    try:
        yield
    finally:
        AsyncSessionLocal.configure(bind=engine)
        await pooled_engine.dispose()
