import pytest
from src.crud.project_crud import ProjectCrud
from src.schemas.project import ProjectCreate, ProjectRead, Criteria

@pytest.mark.asyncio
async def test_fetch_projects_crud(db_session):
    crud = ProjectCrud(db_session)
    for i in range(1, 6):
        project_data = ProjectCreate(
            name=f"Test Project {i}",
            criteria = Criteria(
                inclusion_criteria=["Must be peer reviewed"],
                exclusion_criteria=["Not in English"]
            )
        )
        await crud.create_project(project_data)

    projects = await crud.fetch_projects()
    assert len(projects) == 5

@pytest.mark.asyncio
async def test_create_and_fetch_project_crud(db_session):
    crud = ProjectCrud(db_session)
    project_data = ProjectCreate(
        name="Test",
        criteria = Criteria(
            inclusion_criteria=["A"],
            exclusion_criteria=["B"]
        )
    )
    id, uuid = await crud.create_project(project_data)
    assert uuid
    assert id

    project = await crud.fetch_project_by_uuid(uuid)
    assert project is not None

    project_read = ProjectRead.model_validate(project)
    assert project_read.uuid == uuid
    assert project_read.name == project_data.name
    assert project_read.criteria.inclusion_criteria == project_data.criteria.inclusion_criteria
    assert project_read.criteria.exclusion_criteria == project_data.criteria.exclusion_criteria

@pytest.mark.asyncio
async def test_delete_project_crud(db_session):
    crud = ProjectCrud(db_session)
    project_data = ProjectCreate(
        name="To Be Deleted",
        criteria = Criteria(
            inclusion_criteria=["A"],
            exclusion_criteria=["B"]
        )
    )
    id, uuid = await crud.create_project(project_data)

    deleted = await crud.delete_project(uuid)
    assert deleted

    project = await crud.fetch_project_by_uuid(uuid)
    assert project is None