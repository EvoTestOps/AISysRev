import pytest
from src.api.controllers.health_check import health_check

@pytest.mark.asyncio
async def test_health_check_logic(monkeypatch):
    async def ok(): return None
    monkeypatch.setattr("src.api.controllers.health_check.check_database_connection", ok)
    monkeypatch.setattr("src.api.controllers.health_check.check_redis_connection", ok)
    monkeypatch.setattr("src.api.controllers.health_check.check_celery_worker", ok)

    result = await health_check()
    assert result["status"] == "ok"
    assert result["db"] == "ok"
    assert result["redis"] == "ok"
    assert result["celery"] == "ok"
