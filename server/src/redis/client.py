from src.core.config import settings
import redis

def get_redis_client():
    redis_url = settings.REDIS_URL
    client = redis.from_url(redis_url)
    return client
