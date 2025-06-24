from sqlalchemy.ext.asyncio import create_async_engine
from src.core.config import settings

DB_URL = settings.DB_URL
if not DB_URL:
    raise ValueError("Environment variable DB_URL is not set")

engine = create_async_engine(DB_URL, echo=True)
