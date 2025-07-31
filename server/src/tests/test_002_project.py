import pytest
from src.crud.project_crud import ProjectCrud
from src.schemas.project import ProjectCreate, ProjectRead

@pytest.mark.asyncio
async def test_create_and_fetch_project_crud(db_session):
    crud = ProjectCrud(db_session)
    project_data = ProjectCreate(
        name="Test",
        inclusion_criteria="A",
        exclusion_criteria="B"
    )
    id, uuid = await crud.create_project(project_data)
    assert uuid
    assert id

    project = await crud.fetch_project_by_uuid(uuid)
    assert project is not None

    project_read = ProjectRead.model_validate(project)
    assert project_read.uuid == uuid
    assert project_read.name == project_data.name
    assert project_read.inclusion_criteria == project_data.inclusion_criteria
    assert project_read.exclusion_criteria == project_data.exclusion_criteria
