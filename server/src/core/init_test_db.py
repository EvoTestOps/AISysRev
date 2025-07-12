import asyncio
from src.db.session import Base
from src.db.engine import engine
from src.core.config import settings

async def init_db():
    print(f"Initializing test DB at {settings.DB_URL}")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

if __name__ == "__main__":
    asyncio.run(init_db())