from datetime import datetime, timezone
from enum import Enum
from uuid import UUID

from pydantic import BaseModel


# Remember to keep the client-side file in sync (client/src/components/EventStream.tsx)
class EventName(Enum):
    # Events for JobTask-related things
    JOB_TASK_NOT_STARTED = 1001
    JOB_TASK_PENDING = 1002
    JOB_TASK_RUNNING = 1003
    JOB_TASK_DONE = 1004
    JOB_TASK_ERROR = 1005
    JOB_TASK_RETRY = 1006
    # Event for LLM-related errors
    LLM_ERROR = 2001
    # Events for Job-related things
    JOB_COMPLETE = 3001
    JOB_CREATED = 3002
    JOB_PROGRESS = 3003
    # Events for Project-related things
    PROJECT_CREATED = 4001
    PROJECT_FILE_UPLOADED = 4002
    # Server error
    SERVER_ERROR = 99999


class QueueItem(BaseModel):
    event_name: EventName
    value: dict


class QueueItemWithTimestamp(BaseModel):
    timestamp: str
    event_name: EventName
    value: dict


def event_channel(owner_uuid: UUID) -> str:
    return f"events:{owner_uuid}"


async def publish_event(owner_uuid: UUID, event: QueueItem, redis_client=None):
    from src.redis_client.client import get_shared_redis_client

    item = QueueItemWithTimestamp(
        timestamp=datetime.now(timezone.utc).isoformat(),
        event_name=event.event_name,
        value=event.value,
    )
    client = redis_client if redis_client is not None else get_shared_redis_client()
    try:
        await client.publish(event_channel(owner_uuid), item.model_dump_json())
    except Exception:
        print("An error occurred while publishing event to Redis")
