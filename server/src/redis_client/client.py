from src.core.config import settings
import redis.asyncio as redis


def get_redis_client():
    redis_url = settings.REDIS_URL
    client = redis.from_url(
        redis_url, decode_responses=True, socket_keepalive=True, retry_on_timeout=True
    )
    return client
