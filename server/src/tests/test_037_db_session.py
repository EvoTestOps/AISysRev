"""The connection pool switch in src/db/session.py.

Creating or disposing an engine doesn't connect, so these don't need the database.
"""

import pytest
from sqlalchemy import NullPool

from src.core.config import settings
from src.db.engine import engine
from src.db.session import AsyncSessionLocal, connection_pool

pytestmark = pytest.mark.asyncio


@pytest.mark.unit
async def test_sessions_use_the_null_pool_engine_by_default():
    assert AsyncSessionLocal.kw["bind"] is engine
    assert isinstance(engine.pool, NullPool)


@pytest.mark.unit
async def test_connection_pool_binds_sessions_to_a_pooled_engine_while_open():
    async with connection_pool():
        pooled_engine = AsyncSessionLocal.kw["bind"]

        assert pooled_engine is not engine
        assert not isinstance(pooled_engine.pool, NullPool)
        assert pooled_engine.pool.size() == settings.DB_POOL_SIZE

    assert AsyncSessionLocal.kw["bind"] is engine
