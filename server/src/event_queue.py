import asyncio
from pydantic import BaseModel
from pydantic.types import Enum


class EventName(Enum):
    # Events for JobTask-related things
    JOB_TASK_NOT_STARTED = 1001
    JOB_TASK_PENDING = 1002
    JOB_TASK_RUNNING = 1003
    JOB_TASK_DONE = 1004
    JOB_TASK_ERROR = 1005
    # Event for OpenRouter related errors
    OPENROUTER_ERROR = 2001
    # Events for Job-related things
    JOB_COMPLETE = 3001
    JOB_CREATED = 3002
    # Events for Project-related things
    PROJECT_CREATED = 4001
    # Events for Project-related things
    # Server error
    SERVER_ERROR = 99999


class QueueItem(BaseModel):
    event_name: EventName
    value: dict


queue = asyncio.Queue(maxsize=1000)


async def push_event(event: QueueItem):
    try:
        await queue.put(event)
    except:
        print("An error occured while pushing events to the front-end")
