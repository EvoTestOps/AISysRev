from concurrent.futures import ThreadPoolExecutor

import pytest

from src.core.cache import TTLCache, hash_key

pytestmark = pytest.mark.unit


class Clock:
    """A timer for the cache, moved by setting now."""

    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


def test_returns_value_until_it_expires():
    clock = Clock()
    store: TTLCache[str] = TTLCache(timer=clock)
    store.put("k", "value", ttl_seconds=60)

    clock.now = 1059.0
    assert store.get("k") == "value"
    clock.now = 1060.0
    assert store.get("k") is None


def test_each_entry_has_its_own_ttl():
    clock = Clock()
    store: TTLCache[str] = TTLCache(timer=clock)
    store.put("short", "value", ttl_seconds=10)
    store.put("long", "value", ttl_seconds=60)

    clock.now = 1030.0

    assert store.get("short") is None
    assert store.get("long") == "value"


def test_missing_key_returns_none():
    assert TTLCache[str]().get("missing") is None


def test_expired_entries_are_not_counted():
    clock = Clock()
    store: TTLCache[str] = TTLCache(timer=clock)
    store.put("old", "value", ttl_seconds=1)
    store.put("new", "value", ttl_seconds=60)

    clock.now = 1030.0

    assert len(store) == 1


def test_evicts_least_recently_used_when_full():
    store: TTLCache[str] = TTLCache(maxsize=2)
    store.put("a", "value", ttl_seconds=60)
    store.put("b", "value", ttl_seconds=60)
    store.get("a")

    store.put("c", "value", ttl_seconds=60)

    assert store.get("a") == "value"
    assert store.get("b") is None
    assert store.get("c") == "value"


def test_concurrent_use_from_threads_keeps_the_cache_consistent():
    store: TTLCache[int] = TTLCache(maxsize=50)

    def work(worker: int) -> None:
        for i in range(2000):
            key = f"{worker}-{i % 100}"
            store.put(key, i, ttl_seconds=60)
            store.get(key)
            store.get(f"{(worker + 1) % 8}-{i % 100}")
            if i % 500 == 0:
                len(store)

    with ThreadPoolExecutor(max_workers=8) as pool:
        # list() re-raises any exception from the threads
        list(pool.map(work, range(8)))

    assert len(store) == 50


def test_clear_removes_all_entries():
    store: TTLCache[str] = TTLCache()
    store.put("a", "value", ttl_seconds=60)
    store.put("b", "value", ttl_seconds=60)

    store.clear()

    assert len(store) == 0


def test_caches_are_separate():
    first: TTLCache[str] = TTLCache()
    second: TTLCache[str] = TTLCache()
    first.put("k", "value", ttl_seconds=60)

    assert second.get("k") is None


def test_hash_key_depends_on_namespace_and_parts():
    key = hash_key("openrouter", {"zdr": True}, "key-a")

    assert key == hash_key("openrouter", {"zdr": True}, "key-a")
    assert key != hash_key("openrouter", {"zdr": False}, "key-a")
    assert key != hash_key("openrouter", {"zdr": True}, "key-b")
    assert key != hash_key("openai", {"zdr": True}, "key-a")


def test_hash_key_ignores_dict_order():
    assert hash_key("n", {"a": 1, "b": 2}) == hash_key("n", {"b": 2, "a": 1})


def test_hash_key_does_not_contain_the_parts():
    assert "secret-key" not in hash_key("openai", {}, "secret-key")
