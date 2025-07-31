import pytest
from fastapi.testclient import TestClient
from src.main import app

@pytest.fixture(scope="function")
def test_client():
    with TestClient(app) as client:
        yield client

@pytest.fixture(scope="function")
def project_payload():
    return {
        "name": "Test Project",
        "inclusion_criteria": "Must be peer reviewed",
        "exclusion_criteria": "Not in English"
    }

@pytest.fixture(scope="function")
def project_endpoint():
    return "/api/v1/project"

@pytest.fixture(scope="function") 
def health_endpoint():
    return "/api/v1/health"
