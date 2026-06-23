import pytest
from src.crud.project_crud import ProjectCrud
from src.crud.user_crud import UserCrud
from src.schemas.project import Criteria, ProjectCreate, ProjectRead
from src.schemas.user import UserCreate


@pytest.mark.asyncio
async def test_fetch_projects_crud(db_ctx):
    user_crud = db_ctx.crud(UserCrud)
    user = await user_crud.create_user(
        UserCreate(sub="test-owner", email="test@test.com", name="Test User")
    )

    crud = db_ctx.crud(ProjectCrud)
    for i in range(1, 6):
        project_data = ProjectCreate(
            name=f"Test Project {i}",
            owner_uuid=user.uuid,
            criteria=Criteria(
                inclusion_criteria=["Must be peer reviewed"],
                exclusion_criteria=["Not in English"],
            ),
        )
        await crud.create_project(project_data)

    projects = await crud.fetch_projects(user.uuid)
    assert len(projects) == 5


@pytest.mark.asyncio
async def test_create_and_fetch_project_crud(db_ctx, test_user_uuid):
    crud = db_ctx.crud(ProjectCrud)
    project_data = ProjectCreate(
        name="Test",
        owner_uuid=test_user_uuid,
        criteria=Criteria(inclusion_criteria=["A"], exclusion_criteria=["B"]),
    )
    id, uuid = await crud.create_project(project_data)

    assert uuid
    assert id

    project = await crud.fetch_project_by_uuid(uuid)
    assert project is not None

    project_read = ProjectRead.model_validate(project)
    assert project_read.uuid == uuid
    assert project_read.name == project_data.name
    assert (
        project_read.criteria.inclusion_criteria
        == project_data.criteria.inclusion_criteria
    )
    assert (
        project_read.criteria.exclusion_criteria
        == project_data.criteria.exclusion_criteria
    )


@pytest.mark.asyncio
async def test_delete_project_crud(db_ctx, test_user_uuid):
    crud = db_ctx.crud(ProjectCrud)
    project_data = ProjectCreate(
        name="To Be Deleted",
        owner_uuid=test_user_uuid,
        criteria=Criteria(inclusion_criteria=["A"], exclusion_criteria=["B"]),
    )
    id, uuid = await crud.create_project(project_data)

    deleted = await crud.delete_project(uuid)
    assert deleted

    project = await crud.fetch_project_by_uuid(uuid)
    assert project is None
