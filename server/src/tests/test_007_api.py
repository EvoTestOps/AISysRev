import pytest

from src.crud.setting_crud import SettingCrud
from src.crud.user_crud import UserCrud
from src.schemas.user import UserCreate
from src.schemas.setting import SettingCreate


@pytest.mark.asyncio
async def test_users_only_see_their_own_api_keys(db_ctx):
    user_crud = db_ctx.crud(UserCrud)
    setting_crud = db_ctx.crud(SettingCrud)

    user_a = await user_crud.create_user(UserCreate(sub="user-a", email="a@test.com"))
    user_b = await user_crud.create_user(UserCreate(sub="user-b", email="b@test.com"))

    await setting_crud.upsert_setting(SettingCreate(
        owner_uuid=user_a.uuid,
        name="openai_api_key",
        value="api_key_a",
        secret=True,
    ))
    await db_ctx.commit()

    result_a = await setting_crud.fetch_setting("openai_api_key", owner_uuid=user_a.uuid)
    assert result_a.value == "api_key_a"

    cross = await setting_crud.fetch_setting("openai_api_key", owner_uuid=user_b.uuid)
    assert cross is None
    


@pytest.mark.asyncio
async def test_users_can_only_delete_their_own_api_keys(db_ctx):
    user_crud = db_ctx.crud(UserCrud)
    setting_crud = db_ctx.crud(SettingCrud)

    user_a = await user_crud.create_user(UserCreate(sub="del-user-a", email="da@test.com"))
    user_b = await user_crud.create_user(UserCreate(sub="del-user-b", email="db@test.com"))

    await setting_crud.upsert_setting(SettingCreate(
        owner_uuid=user_a.uuid,
        name="openai_api_key",
        value="api_key_a",
        secret=True,
    ))
    await db_ctx.commit()

    delete_result = await setting_crud.delete_setting("openai_api_key", owner_uuid=user_b.uuid)
    assert delete_result is False

    result_a = await setting_crud.fetch_setting("openai_api_key", owner_uuid=user_a.uuid)
    assert result_a.value == "api_key_a"


@pytest.mark.asyncio
async def tests_same_api_key_name_different_users(db_ctx):
    user_crud = db_ctx.crud(UserCrud)
    setting_crud = db_ctx.crud(SettingCrud)

    user_a = await user_crud.create_user(UserCreate(sub="same-name-user-a", email="a@test.com"))
    user_b = await user_crud.create_user(UserCreate(sub="same-name-user-b", email="b@test.com"))

    await setting_crud.upsert_setting(SettingCreate(
        owner_uuid=user_a.uuid,
        name="openai_api_key",
        value="api_key_a",
        secret=True,
    ))
    await setting_crud.upsert_setting(SettingCreate(
        owner_uuid=user_b.uuid,
        name="openai_api_key",
        value="api_key_b",
        secret=True,
    ))
    await db_ctx.commit()

    result_a = await setting_crud.fetch_setting("openai_api_key", owner_uuid=user_a.uuid)
    assert result_a.value == "api_key_a"

    result_b = await setting_crud.fetch_setting("openai_api_key", owner_uuid=user_b.uuid)
    assert result_b.value == "api_key_b"
