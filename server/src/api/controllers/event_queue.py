from fastapi.responses import StreamingResponse
from fastapi import APIRouter, Request
from src.event_queue import QueueItem, queue
import asyncio

router = APIRouter()

KEEPALIVE_INTERVAL = 10


@router.get("/event-queue")
async def event_bus(request: Request):
    async def stream():
        yield ": connected\n\n"
        try:
            while True:
                if await request.is_disconnected():
                    print("Client disconnected")
                    break

                try:
                    message: QueueItem = await asyncio.wait_for(
                        queue.get(), timeout=KEEPALIVE_INTERVAL
                    )
                    yield f"data: {message.model_dump_json()}\n\n"
                except asyncio.TimeoutError:
                    yield "event: ping\ndata: keepalive\n\n"
        except asyncio.CancelledError:
            print("CancelledError: streaming task was cancelled")
            raise  # important: re-raise so Uvicorn cleans up properly

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )
