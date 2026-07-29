import asyncio

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from src.core.auth import get_current_user
from src.db.models.user import User
from src.event_queue import event_channel
from src.redis_client.client import get_redis_client

router = APIRouter()

KEEPALIVE_INTERVAL = 10


@router.get("/event-queue", tags=["Event queue"])
async def event_bus(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    channel = event_channel(current_user.uuid)

    async def stream():
        redis_client = get_redis_client()
        pubsub = redis_client.pubsub()
        try:
            await pubsub.subscribe(channel)
            yield ": connected\n\n"
            while True:
                if await request.is_disconnected():
                    print("Client disconnected")
                    break

                message = await pubsub.get_message(
                    ignore_subscribe_messages=True, timeout=KEEPALIVE_INTERVAL
                )
                if message is not None and message["type"] == "message":
                    yield f"data: {message['data']}\n\n"
                else:
                    yield "event: ping\ndata: keepalive\n\n"
        except asyncio.CancelledError:
            print("CancelledError: streaming task was cancelled")
            raise  # important: re-raise so Uvicorn cleans up properly
        finally:
            try:
                await pubsub.unsubscribe(channel)
            except Exception:
                pass
            await pubsub.aclose()
            await redis_client.aclose()

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )
