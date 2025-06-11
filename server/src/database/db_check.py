from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os
from dotenv import load_dotenv
from sqlalchemy.engine.url import make_url

load_dotenv()

DB_URL = os.getenv("DB_URL")

engine = create_async_engine(DB_URL, echo=True)
url = make_url(DB_URL)
print(f"Dialect: {url.get_dialect().__module__}")

async def check_database_connection():
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT * FROM pg_database"))
        rows = result.fetchall()  # NOT awaitable
        print("Database check successful. Databases:")
        for row in rows:
            print(row)
