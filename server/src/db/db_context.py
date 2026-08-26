from typing import AsyncGenerator, Type

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from .session import AsyncSessionLocal


class DBContext:
    def __init__(
        self, session_factory: async_sessionmaker[AsyncSession] = AsyncSessionLocal
    ):
        self._session_factory = session_factory
        self.session: AsyncSession | None = None

    async def __aenter__(self):
        self.session = self._session_factory()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if not self.session:
            raise RuntimeError("Session not initialized.")
        try:
            if exc_type:
                await self.session.rollback()
        finally:
            await self.session.close()

    async def commit(self):
        if not self.session:
            raise RuntimeError("Session not initialized.")
        await self.session.commit()

    async def rollback(self):
        if not self.session:
            raise RuntimeError("Session not initialized.")
        await self.session.rollback()

    def crud(self, crud_cls: Type):
        if not self.session:
            raise RuntimeError("Session not initialized.")
        return crud_cls(self.session)

    def nested(self):
        if not self.session:
            raise RuntimeError("Session not initialized.")
        return self.session.begin_nested()


async def get_db_ctx() -> AsyncGenerator[DBContext, None]:
    async with DBContext() as db_ctx:
        yield db_ctx
