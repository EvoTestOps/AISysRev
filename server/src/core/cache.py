"""In-memory caching for values that are slow to get and rarely change, e.g.
lists fetched from external APIs.

A cache lives in its process: it is empty after a restart and not shared
between processes (the API runs as one process; Celery workers have their own).
Use Redis instead for anything that must be shared or survive restarts.
"""

import hashlib
import json
import threading
import time
from typing import Any, Callable, Generic, NamedTuple, TypeVar

from cachetools import TLRUCache

V = TypeVar("V")


def hash_key(namespace: str, *parts: Any) -> str:
    """A cache key for the given parts, e.g. parameters and an API key. The parts
    are hashed, so secrets among them aren't kept in the cache. They must be
    JSON-serializable; other values (e.g. UUIDs) are converted with str()."""
    payload = json.dumps(parts, sort_keys=True, default=str)
    return f"{namespace}:{hashlib.sha256(payload.encode()).hexdigest()}"


class _Entry(NamedTuple, Generic[V]):
    value: V
    ttl_seconds: float


def _expires_at(_key: str, entry: _Entry[Any], now: float) -> float:
    return now + entry.ttl_seconds


class TTLCache(Generic[V]):
    """Values that expire after a time to live (TTL) given per entry. Holds at
    most maxsize entries: when full, expired entries go first, then the least
    recently used ones.

    Thread-safe: cachetools' caches aren't, and even a get changes them (the
    least recently used order), so every operation holds a lock. The operations
    are short and never await, so the lock is safe to take on the event loop.
    """

    def __init__(
        self, maxsize: int = 1024, timer: Callable[[], float] = time.monotonic
    ) -> None:
        self._entries: TLRUCache[str, _Entry[V]] = TLRUCache(
            maxsize=maxsize, ttu=_expires_at, timer=timer
        )
        self._lock = threading.Lock()

    def get(self, key: str) -> V | None:
        with self._lock:
            entry = self._entries.get(key)
        return None if entry is None else entry.value

    def put(self, key: str, value: V, ttl_seconds: float) -> None:
        with self._lock:
            self._entries[key] = _Entry(value, ttl_seconds)

    def clear(self) -> None:
        with self._lock:
            self._entries.clear()

    def __len__(self) -> int:
        with self._lock:
            self._entries.expire()
            return len(self._entries)
