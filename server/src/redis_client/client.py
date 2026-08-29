import redis.asyncio as redis

from src.core.config import settings

_shared_client: redis.Redis | None = None


def get_redis_client():
    return redis.from_url(
        settings.REDIS_URL,
        decode_responses=True,
        socket_keepalive=True,
        retry_on_timeout=True,
    )


def get_shared_redis_client() -> redis.Redis:
    global _shared_client
    if _shared_client is None:
        _shared_client = get_redis_client()
    return _shared_client


async def close_shared_redis_client():
    global _shared_client
    if _shared_client is not None:
        await _shared_client.aclose()
        _shared_client = None
