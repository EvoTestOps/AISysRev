import asyncio
from pydantic import ValidationError
from src.event_queue import QueueItem, push_event
from src.core.config import settings
import redis.asyncio as redis

REDIS_CHANNEL = "app_event_queue"


def get_redis_client():
    redis_url = settings.REDIS_URL
    client = redis.from_url(
        redis_url, decode_responses=True, socket_keepalive=True, retry_on_timeout=True
    )
    return client


async def redis_subscribe():
    redis_client = get_redis_client()
    async with redis_client.pubsub() as pubsub:
        print("Subscribing to " + REDIS_CHANNEL)
        await pubsub.subscribe(REDIS_CHANNEL)
        print("Subscribed to " + REDIS_CHANNEL)
        print("Starting to listen to events")
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    print(f"Received: {message['data']}")
                    print("Validating message")
                    try:
                        item = QueueItem.model_validate_json(message["data"])
                        print("Pushing to event bus")
                        await push_event(item)
                    except ValidationError as e:
                        print("ValidationError: " + str(e))
        except asyncio.CancelledError:
            print("Subscriber cancelled")
            raise
        finally:
            try:
                print("Unsubscribing from " + REDIS_CHANNEL)
                await pubsub.unsubscribe(REDIS_CHANNEL)
            except Exception:
                pass
