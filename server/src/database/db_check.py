from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.engine.url import make_url

from database.engine import engine

url = make_url(engine.url)
print(f"Dialect: {url.get_dialect().__module__}")

async def check_database_connection():
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT * FROM pg_database"))
            result.fetchall()
            print("Database check successful.")
    except SQLAlchemyError as e:
        print(f"Database connection failed: {e}")