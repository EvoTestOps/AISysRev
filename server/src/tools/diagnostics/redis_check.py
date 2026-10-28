import logging

import redis.asyncio as redis

from src.core.config import settings

logger = logging.getLogger(__name__)


async def check_redis_connection():
    redis_url = settings.REDIS_URL
    client = redis.from_url(redis_url, decode_responses=True)
    try:
        pong = await client.ping()
        if pong:
            logger.info("Redis connection OK")
        else:
            raise ConnectionError("Redis ping failed")
    except Exception as e:
        logger.error("Redis connection failed: %s", e)
        raise
    finally:
        await client.close()
