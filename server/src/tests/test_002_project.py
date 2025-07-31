from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)
prefix = "/api/v1"

def test_create_and_get_project():
    payload = {
        "name": "Test Project",
        "inclusion_criteria": "Must be peer reviewed",
        "exclusion_criteria": "Not in English"
    }
    response = client.post(f"{prefix}/project", json=payload)
    assert response.status_code == 201
    project_res = response.json()
    assert "uuid" in project_res

    response = client.get(f"{prefix}/project/{project_res['uuid']}")
    assert response.status_code == 200
    project = response.json()
    assert project["uuid"] == project_res["uuid"]
    assert project["name"] == payload["name"]
    assert project["inclusion_criteria"] == payload["inclusion_criteria"]
    assert project["exclusion_criteria"] == payload["exclusion_criteria"]
    assert "created_at" in project
    assert "updated_at" in project
