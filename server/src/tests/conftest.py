"""Fixtures shared by the CRUD tests."""

import pytest_asyncio

from src.db.db_context import DBContext
from src.tests.factory import Factory


@pytest_asyncio.fixture
async def factory(db_ctx: DBContext) -> Factory:
    return Factory(db_ctx)
