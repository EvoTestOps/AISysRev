import pytest

@pytest.mark.api
@pytest.mark.integration
def test_health_check(test_client, health_endpoint):
    response = test_client.get(health_endpoint)
    assert response.status_code == 200
    data = response.json()
    assert "db" in data
    assert "redis" in data
    assert "celery" in data
    assert "status" in data
    assert data["status"] == "ok"
    assert data["db"] == "ok"
    assert data["redis"] == "ok"
    assert data["celery"] == "ok"
