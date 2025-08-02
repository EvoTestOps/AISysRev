import os
import logging
from sqlalchemy import NullPool
from sqlalchemy.ext.asyncio import create_async_engine
from src.core.config import settings

logging.basicConfig()
logging.getLogger("sqlalchemy.engine").setLevel(logging.DEBUG)

DB_URL = settings.DB_URL
if not DB_URL:
    raise ValueError("Environment variable DB_URL is not set")

db_echo = os.getenv("APP_ENV", "dev") != "test"

engine = create_async_engine(DB_URL, echo=db_echo, poolclass=NullPool)
