import json

import pytest

from src.api.controllers.health_check import health_check, liveness, startup_complete


@pytest.mark.asyncio
async def test_health_check_logic(monkeypatch):
    startup_complete.set()

    async def ok():
        return None

    monkeypatch.setattr(
        "src.api.controllers.health_check.check_database_connection", ok
    )
    monkeypatch.setattr("src.api.controllers.health_check.check_redis_connection", ok)
    monkeypatch.setattr("src.api.controllers.health_check.check_celery_worker", ok)

    response = await health_check()

    payload = json.loads(response.body)

    assert payload["status"] == "ok"
    assert payload["db"] == "ok"
    assert payload["redis"] == "ok"
    assert payload["celery"] == "ok"


@pytest.mark.asyncio
async def test_liveness_does_not_touch_dependencies(monkeypatch):
    async def fail():
        raise AssertionError("liveness must not call dependency checks")

    monkeypatch.setattr(
        "src.api.controllers.health_check.check_database_connection", fail
    )
    monkeypatch.setattr("src.api.controllers.health_check.check_redis_connection", fail)
    monkeypatch.setattr("src.api.controllers.health_check.check_celery_worker", fail)

    assert await liveness() == {"status": "ok"}


@pytest.mark.asyncio
async def test_health_check_stays_ready_when_only_celery_is_down(monkeypatch):
    startup_complete.set()

    async def ok():
        return None

    async def no_workers():
        raise ConnectionError("No Celery workers responded")

    monkeypatch.setattr(
        "src.api.controllers.health_check.check_database_connection", ok
    )
    monkeypatch.setattr("src.api.controllers.health_check.check_redis_connection", ok)
    monkeypatch.setattr(
        "src.api.controllers.health_check.check_celery_worker", no_workers
    )

    response = await health_check()

    payload = json.loads(response.body)

    assert response.status_code == 200
    assert payload["status"] == "ok"
    assert payload["celery"] == "error: No Celery workers responded"


@pytest.mark.asyncio
@pytest.mark.parametrize("failing", ["db", "redis"])
async def test_health_check_is_unready_when_db_or_redis_is_down(monkeypatch, failing):
    startup_complete.set()

    async def ok():
        return None

    async def down():
        raise ConnectionError("down")

    checks = {
        "db": "check_database_connection",
        "redis": "check_redis_connection",
        "celery": "check_celery_worker",
    }
    for name, attr in checks.items():
        monkeypatch.setattr(
            f"src.api.controllers.health_check.{attr}",
            down if name == failing else ok,
        )

    response = await health_check()

    payload = json.loads(response.body)

    assert response.status_code == 503
    assert payload["status"] == "error"
    assert payload[failing] == "error: down"
