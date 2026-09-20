import datetime
from uuid import uuid4

import pytest
from sqlalchemy.exc import IntegrityError

from src.crud.project_crud import ProjectCrud
from src.crud.user_crud import UserCrud
from src.db.db_context import DBContext
from src.schemas.user import UserCreate
from src.tests.factory import Factory

pytestmark = pytest.mark.asyncio


async def test_create_user_stores_given_fields(db_ctx: DBContext):
    crud = db_ctx.crud(UserCrud)

    user = await crud.create_user(UserCreate(sub=f"sub-{uuid4()}", email="a@b.c"))

    assert user.id is not None
    assert user.uuid is not None
    assert user.email == "a@b.c"
    assert user.created_at is not None
    assert user.consent_anonymized_research_usage is None


async def test_create_user_without_email(db_ctx: DBContext):
    crud = db_ctx.crud(UserCrud)

    user = await crud.create_user(UserCreate(sub=f"sub-{uuid4()}"))

    assert user.email is None


async def test_create_user_with_duplicate_sub_fails(db_ctx: DBContext):
    crud = db_ctx.crud(UserCrud)
    sub = f"sub-{uuid4()}"
    await crud.create_user(UserCreate(sub=sub))

    with pytest.raises(IntegrityError):
        await crud.create_user(UserCreate(sub=sub))


async def test_get_user_by_sub(db_ctx: DBContext, factory: Factory):
    user = await factory.user()
    crud = db_ctx.crud(UserCrud)

    found = await crud.get_user_by_sub(user.sub)

    assert found is not None
    assert found.uuid == user.uuid


async def test_get_user_by_sub_returns_none_for_unknown_sub(db_ctx: DBContext):
    crud = db_ctx.crud(UserCrud)

    assert await crud.get_user_by_sub(f"missing-{uuid4()}") is None


async def test_get_user_by_uuid(db_ctx: DBContext, factory: Factory):
    user = await factory.user()
    crud = db_ctx.crud(UserCrud)

    found = await crud.get_user_by_uuid(str(user.uuid))

    assert found is not None
    assert found.sub == user.sub


async def test_get_user_by_uuid_returns_none_for_unknown_uuid(db_ctx: DBContext):
    crud = db_ctx.crud(UserCrud)

    assert await crud.get_user_by_uuid(str(uuid4())) is None


async def test_update_research_consent_sets_value_and_timestamp(
    db_ctx: DBContext, factory: Factory
):
    user = await factory.user()
    crud = db_ctx.crud(UserCrud)
    before = datetime.datetime.now(datetime.timezone.utc)

    updated = await crud.update_research_consent(str(user.uuid), True)

    assert updated is not None
    assert updated.consent_anonymized_research_usage is True
    assert updated.consent_anonymized_research_usage_updated_at is not None
    assert updated.consent_anonymized_research_usage_updated_at >= before


async def test_update_research_consent_can_withdraw_consent(
    db_ctx: DBContext, factory: Factory
):
    user = await factory.user()
    crud = db_ctx.crud(UserCrud)
    await crud.update_research_consent(str(user.uuid), True)

    updated = await crud.update_research_consent(str(user.uuid), False)

    assert updated is not None
    assert updated.consent_anonymized_research_usage is False


async def test_update_research_consent_returns_none_for_unknown_user(db_ctx: DBContext):
    crud = db_ctx.crud(UserCrud)

    assert await crud.update_research_consent(str(uuid4()), True) is None


async def test_update_consent_versions_sets_terms_and_privacy_policy(
    db_ctx: DBContext, factory: Factory
):
    user = await factory.user()
    crud = db_ctx.crud(UserCrud)
    accepted_at = datetime.datetime(2026, 6, 8, 12, 0, tzinfo=datetime.timezone.utc)

    updated = await crud.update_consent_versions(
        str(user.uuid), "t1", "p1", accepted_at
    )

    assert updated is not None
    assert updated.terms_version_accepted == "t1"
    assert updated.terms_accepted_at == accepted_at
    assert updated.privacy_policy_version_accepted == "p1"
    assert updated.privacy_policy_accepted_at == accepted_at


async def test_update_consent_versions_returns_none_for_unknown_user(db_ctx: DBContext):
    crud = db_ctx.crud(UserCrud)
    now = datetime.datetime.now(datetime.timezone.utc)

    assert await crud.update_consent_versions(str(uuid4()), "t", "p", now) is None


async def test_delete_user_removes_the_user(db_ctx: DBContext, factory: Factory):
    user = await factory.user()
    crud = db_ctx.crud(UserCrud)

    assert await crud.delete_user(str(user.uuid)) is True
    await factory.flush()

    assert await crud.get_user_by_uuid(str(user.uuid)) is None


async def test_delete_user_returns_false_for_unknown_user(db_ctx: DBContext):
    crud = db_ctx.crud(UserCrud)

    assert await crud.delete_user(str(uuid4())) is False


async def test_delete_user_cascades_to_their_projects(
    db_ctx: DBContext, factory: Factory
):
    user = await factory.user()
    project = await factory.project(user)
    other_user = await factory.user()
    other_project = await factory.project(other_user)

    await db_ctx.crud(UserCrud).delete_user(str(user.uuid))
    await factory.flush()

    projects = db_ctx.crud(ProjectCrud)
    assert await projects.fetch_project_by_uuid(project.uuid, user.uuid) is None
    assert (
        await projects.fetch_project_by_uuid(other_project.uuid, other_user.uuid)
        is not None
    )
