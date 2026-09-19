from uuid import uuid4

import pytest

from src.crud.project_crud import ProjectCrud
from src.db.db_context import DBContext
from src.schemas.project import (
    Criteria,
    FewShotPreferences,
    ProjectCreate,
    ProjectPreferences,
    ScreeningTarget,
)
from src.tests.factory import Factory

pytestmark = pytest.mark.asyncio


def _project_data(owner, name="Project", **kwargs) -> ProjectCreate:
    return ProjectCreate(
        name=name,
        owner_uuid=owner.uuid,
        criteria=Criteria(inclusion_criteria=["A"], exclusion_criteria=["B"]),
        **kwargs,
    )


async def test_create_project_returns_id_and_uuid(db_ctx: DBContext, factory: Factory):
    owner = await factory.user()
    crud = db_ctx.crud(ProjectCrud)

    project_id, project_uuid = await crud.create_project(_project_data(owner))

    assert project_id
    assert project_uuid
    stored = await crud.fetch_project_by_uuid(project_uuid, owner.uuid)
    assert stored is not None
    assert stored.id == project_id


async def test_create_project_defaults_to_paper_screening_target(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    crud = db_ctx.crud(ProjectCrud)

    _, project_uuid = await crud.create_project(_project_data(owner))

    stored = await crud.fetch_project_by_uuid(project_uuid, owner.uuid)
    assert stored is not None
    assert stored.screening_target == "PAPER"
    assert stored.preferences is None


async def test_create_project_stores_criteria_as_a_dict(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    crud = db_ctx.crud(ProjectCrud)
    data = ProjectCreate(
        name="With expressions",
        owner_uuid=owner.uuid,
        criteria=Criteria(
            inclusion_criteria=["A", "B"],
            exclusion_criteria=["C"],
            inclusion_expression="IC1 AND IC2",
        ),
    )

    _, project_uuid = await crud.create_project(data)

    stored = await crud.fetch_project_by_uuid(project_uuid, owner.uuid)
    assert stored is not None
    assert stored.criteria["inclusion_criteria"] == ["A", "B"]
    assert stored.criteria["exclusion_criteria"] == ["C"]
    assert stored.criteria["inclusion_expression"] == "IC1 AND IC2"
    assert stored.criteria["exclusion_expression"] is None


async def test_create_project_stores_github_screening_target(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    crud = db_ctx.crud(ProjectCrud)

    _, project_uuid = await crud.create_project(
        _project_data(owner, screening_target=ScreeningTarget.GITHUB_REPOSITORY)
    )

    stored = await crud.fetch_project_by_uuid(project_uuid, owner.uuid)
    assert stored is not None
    assert stored.screening_target == "GITHUB_REPOSITORY"


async def test_create_projects_creates_many_and_returns_them(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    crud = db_ctx.crud(ProjectCrud)

    created = await crud.create_projects(
        [_project_data(owner, name=f"P{i}") for i in range(3)]
    )

    assert sorted(p.name for p in created) == ["P0", "P1", "P2"]
    assert len({p.uuid for p in created}) == 3
    assert len(await crud.fetch_projects(owner.uuid)) == 3


async def test_fetch_projects_returns_only_the_owners_projects(
    db_ctx: DBContext, factory: Factory
):
    alice = await factory.user()
    bob = await factory.user()
    await factory.project(alice, name="alice-1")
    await factory.project(alice, name="alice-2")
    await factory.project(bob, name="bob-1")
    crud = db_ctx.crud(ProjectCrud)

    projects = await crud.fetch_projects(alice.uuid)

    assert sorted(p["name"] for p in projects) == ["alice-1", "alice-2"]


async def test_fetch_projects_is_empty_for_owner_without_projects(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()

    assert len(await db_ctx.crud(ProjectCrud).fetch_projects(owner.uuid)) == 0


async def test_fetch_project_by_uuid_returns_none_for_unknown_uuid(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()

    assert (
        await db_ctx.crud(ProjectCrud).fetch_project_by_uuid(uuid4(), owner.uuid)
        is None
    )


async def test_fetch_project_by_uuid_hides_other_owners_projects(
    db_ctx: DBContext, factory: Factory
):
    alice = await factory.user()
    bob = await factory.user()
    project = await factory.project(alice)

    assert (
        await db_ctx.crud(ProjectCrud).fetch_project_by_uuid(project.uuid, bob.uuid)
        is None
    )


async def test_get_project_preferences_is_none_when_not_set(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)

    prefs = await db_ctx.crud(ProjectCrud).get_project_preferences(
        project.uuid, owner.uuid
    )

    assert prefs is None


async def test_get_project_preferences_is_none_for_unknown_project(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()

    prefs = await db_ctx.crud(ProjectCrud).get_project_preferences(uuid4(), owner.uuid)

    assert prefs is None


async def test_update_project_preferences_round_trips(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)
    crud = db_ctx.crud(ProjectCrud)
    prefs = ProjectPreferences(
        few_shot=FewShotPreferences(inc_seed_papers=["p1"], exc_seed_papers=["p2"])
    )

    assert await crud.update_project_preferences(project.uuid, owner.uuid, prefs)

    stored = await crud.get_project_preferences(project.uuid, owner.uuid)
    assert stored == prefs


async def test_update_project_preferences_ignores_other_owners(
    db_ctx: DBContext, factory: Factory
):
    alice = await factory.user()
    bob = await factory.user()
    project = await factory.project(alice)
    crud = db_ctx.crud(ProjectCrud)
    prefs = ProjectPreferences(few_shot=None)

    updated = await crud.update_project_preferences(project.uuid, bob.uuid, prefs)

    assert updated is False
    assert await crud.get_project_preferences(project.uuid, alice.uuid) is None


async def test_set_criteria_embeddings_stores_both_lists(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)
    crud = db_ctx.crud(ProjectCrud)

    updated = await crud.set_criteria_embeddings(
        project.uuid, owner.uuid, [[0.1, 0.2]], [[0.3, 0.4], [0.5, 0.6]]
    )

    assert updated is True
    await factory.reload(project)
    assert project.inclusion_criteria_embedding == [[0.1, 0.2]]
    assert project.exclusion_criteria_embedding == [[0.3, 0.4], [0.5, 0.6]]


async def test_set_criteria_embeddings_can_clear_them(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)
    crud = db_ctx.crud(ProjectCrud)
    await crud.set_criteria_embeddings(project.uuid, owner.uuid, [[1.0]], [[2.0]])

    await crud.set_criteria_embeddings(project.uuid, owner.uuid, None, None)

    await factory.reload(project)
    assert project.inclusion_criteria_embedding is None
    assert project.exclusion_criteria_embedding is None


async def test_set_criteria_embeddings_ignores_other_owners(
    db_ctx: DBContext, factory: Factory
):
    alice = await factory.user()
    bob = await factory.user()
    project = await factory.project(alice)
    crud = db_ctx.crud(ProjectCrud)

    updated = await crud.set_criteria_embeddings(
        project.uuid, bob.uuid, [[1.0]], [[2.0]]
    )

    assert updated is False
    await factory.reload(project)
    assert project.inclusion_criteria_embedding is None


async def test_delete_project_removes_it(db_ctx: DBContext, factory: Factory):
    owner = await factory.user()
    project = await factory.project(owner)
    crud = db_ctx.crud(ProjectCrud)

    assert await crud.delete_project(project.uuid, owner.uuid) is True
    await factory.flush()

    assert await crud.fetch_project_by_uuid(project.uuid, owner.uuid) is None


async def test_delete_project_returns_false_for_other_owner(
    db_ctx: DBContext, factory: Factory
):
    alice = await factory.user()
    bob = await factory.user()
    project = await factory.project(alice)
    crud = db_ctx.crud(ProjectCrud)

    assert await crud.delete_project(project.uuid, bob.uuid) is False

    assert await crud.fetch_project_by_uuid(project.uuid, alice.uuid) is not None


async def test_delete_project_returns_false_for_unknown_project(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()

    assert await db_ctx.crud(ProjectCrud).delete_project(uuid4(), owner.uuid) is False


async def test_delete_projects_deletes_only_the_owners_matching_projects(
    db_ctx: DBContext, factory: Factory
):
    alice = await factory.user()
    bob = await factory.user()
    mine_1 = await factory.project(alice)
    mine_2 = await factory.project(alice)
    kept = await factory.project(alice)
    bobs = await factory.project(bob)
    crud = db_ctx.crud(ProjectCrud)

    deleted = await crud.delete_projects(
        [mine_1.uuid, mine_2.uuid, bobs.uuid, uuid4()], alice.uuid
    )
    await factory.flush()

    assert sorted(deleted) == sorted([mine_1.uuid, mine_2.uuid])
    remaining = await crud.fetch_projects(alice.uuid)
    assert [p["uuid"] for p in remaining] == [kept.uuid]
    assert await crud.fetch_project_by_uuid(bobs.uuid, bob.uuid) is not None


async def test_delete_projects_with_empty_list_deletes_nothing(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    await factory.project(owner)
    crud = db_ctx.crud(ProjectCrud)

    assert await crud.delete_projects([], owner.uuid) == []
    assert len(await crud.fetch_projects(owner.uuid)) == 1
