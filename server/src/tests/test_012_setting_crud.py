import pytest

from src.crud.setting_crud import SettingCrud
from src.db.db_context import DBContext
from src.schemas.setting import SettingCreate
from src.tests.factory import Factory

pytestmark = pytest.mark.asyncio


def _setting(owner, name="api_key", value="v", secret=False) -> SettingCreate:
    return SettingCreate(owner_uuid=owner.uuid, name=name, value=value, secret=secret)


async def test_upsert_creates_a_setting(db_ctx: DBContext, factory: Factory):
    owner = await factory.user()
    crud = db_ctx.crud(SettingCrud)

    _, setting_uuid = await crud.upsert_setting(_setting(owner, value="secret-1"))

    fetched = await crud.fetch_setting("api_key", owner.uuid)
    assert fetched is not None
    assert fetched.uuid == setting_uuid
    assert fetched.value == "secret-1"
    assert fetched.secret is False


async def test_upsert_updates_existing_setting_and_keeps_uuid(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    crud = db_ctx.crud(SettingCrud)
    _, first_uuid = await crud.upsert_setting(_setting(owner, value="old"))

    _, second_uuid = await crud.upsert_setting(
        _setting(owner, value="new", secret=True)
    )

    assert second_uuid == first_uuid
    fetched = await crud.fetch_setting("api_key", owner.uuid)
    assert fetched is not None
    assert fetched.value == "new"
    assert fetched.secret is True
    assert len(await crud.fetch_settings(owner.uuid)) == 1


async def test_same_setting_name_is_separate_per_owner(
    db_ctx: DBContext, factory: Factory
):
    alice = await factory.user()
    bob = await factory.user()
    crud = db_ctx.crud(SettingCrud)

    await crud.upsert_setting(_setting(alice, value="alice-value"))
    await crud.upsert_setting(_setting(bob, value="bob-value"))

    alice_setting = await crud.fetch_setting("api_key", alice.uuid)
    bob_setting = await crud.fetch_setting("api_key", bob.uuid)
    assert alice_setting is not None and alice_setting.value == "alice-value"
    assert bob_setting is not None and bob_setting.value == "bob-value"


async def test_fetch_settings_returns_only_the_owners_settings(
    db_ctx: DBContext, factory: Factory
):
    alice = await factory.user()
    bob = await factory.user()
    crud = db_ctx.crud(SettingCrud)
    await crud.upsert_setting(_setting(alice, name="a"))
    await crud.upsert_setting(_setting(alice, name="b"))
    await crud.upsert_setting(_setting(bob, name="c"))

    settings = await crud.fetch_settings(alice.uuid)

    assert sorted(s.name for s in settings) == ["a", "b"]


async def test_fetch_settings_is_empty_for_owner_without_settings(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()

    assert await db_ctx.crud(SettingCrud).fetch_settings(owner.uuid) == []


async def test_fetch_setting_returns_none_when_missing(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()

    assert await db_ctx.crud(SettingCrud).fetch_setting("nope", owner.uuid) is None


async def test_fetch_setting_does_not_return_another_owners_setting(
    db_ctx: DBContext, factory: Factory
):
    alice = await factory.user()
    bob = await factory.user()
    crud = db_ctx.crud(SettingCrud)
    await crud.upsert_setting(_setting(alice))

    assert await crud.fetch_setting("api_key", bob.uuid) is None


async def test_delete_setting_removes_it(db_ctx: DBContext, factory: Factory):
    owner = await factory.user()
    crud = db_ctx.crud(SettingCrud)
    await crud.upsert_setting(_setting(owner))

    assert await crud.delete_setting("api_key", owner.uuid) is True
    await factory.flush()

    assert await crud.fetch_setting("api_key", owner.uuid) is None


async def test_delete_setting_returns_false_when_missing(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()

    assert await db_ctx.crud(SettingCrud).delete_setting("nope", owner.uuid) is False


async def test_delete_setting_does_not_delete_another_owners_setting(
    db_ctx: DBContext, factory: Factory
):
    alice = await factory.user()
    bob = await factory.user()
    crud = db_ctx.crud(SettingCrud)
    await crud.upsert_setting(_setting(alice))

    assert await crud.delete_setting("api_key", bob.uuid) is False

    assert await crud.fetch_setting("api_key", alice.uuid) is not None
