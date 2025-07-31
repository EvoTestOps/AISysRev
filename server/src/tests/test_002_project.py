import pytest

@pytest.mark.api
@pytest.mark.integration
def test_create_and_get_project(test_client, project_payload, project_endpoint):
    response = test_client.post(project_endpoint, json=project_payload)
    assert response.status_code == 201
    project_res = response.json()
    assert "uuid" in project_res

    response = test_client.get(f"{project_endpoint}/{project_res['uuid']}")
    assert response.status_code == 200
    project = response.json()
    assert project["uuid"] == project_res["uuid"]
    assert project["name"] == project_payload["name"]
    assert project["inclusion_criteria"] == project_payload["inclusion_criteria"]
    assert project["exclusion_criteria"] == project_payload["exclusion_criteria"]
    assert "created_at" in project
    assert "updated_at" in project
