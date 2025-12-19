from typing import Type
from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession
from .session import AsyncSessionLocal


class UnitOfWork:
    def __init__(
        self, session_factory: async_sessionmaker[AsyncSession] = AsyncSessionLocal
    ):
        self._session_factory = session_factory
        self.session: AsyncSession | None = None

    async def __aenter__(self):
        self.session = self._session_factory()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        try:
            if exc_type:
                await self.session.rollback()
        finally:
            await self.session.close()

    async def commit(self):
        await self.session.commit()

    async def rollback(self):
        await self.session.rollback()

    def crud(self, crud_cls: Type):
        return crud_cls(self.session)
