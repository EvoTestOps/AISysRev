import json

import pytest

from src.api.controllers.health_check import health_check, startup_complete


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
