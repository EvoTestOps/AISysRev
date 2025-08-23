from src.core.config import settings
import redis
import json


def get_redis_client():
    redis_url = settings.REDIS_URL
    client = redis.from_url(redis_url)
    return client

# Subscribes to job task events, which we publish to the front-end
def subscribe(client: redis.Redis):
    pubsub = client.pubsub()
    pubsub.subscribe("job_task")
    for message in pubsub.listen():
        if message.get("type") == "message":
            data = json.loads(message.get("data"))
            print(data)
