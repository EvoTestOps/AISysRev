import redis.asyncio as redis
from src.core.config import settings

async def check_redis_connection():
    redis_url = settings.REDIS_URL
    client = redis.from_url(redis_url)
    try:
        pong = await client.ping()
        if pong:
            print("Redis connection OK")
        else:
            raise ConnectionError("Redis ping failed")
    except Exception as e:
        print(f"Redis connection failed: {e}")
        raise
    finally:
        await client.close()