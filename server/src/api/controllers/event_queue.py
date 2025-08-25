from fastapi.responses import StreamingResponse
from fastapi import APIRouter, Request
from src.event_queue import QueueItem, queue
import asyncio

router = APIRouter()


@router.get("/event-queue")
async def event_bus(request: Request):
    async def stream():
        yield ": connected\n\n"
        while True:
            try:
                message: QueueItem = await queue.get()
                yield "data: " + message.model_dump_json() + "\n\n"
            except asyncio.TimeoutError:
                if await request.is_disconnected():
                    break
                yield ": keep-alive\n\n"

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-control": "no-cache", "Connection": "keep-alive"},
    )
