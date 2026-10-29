import json
import uuid

import pytest
from fastapi import HTTPException
from starlette.datastructures import Headers
from starlette.requests import Request

from src.api.controllers.auth import delete_account, logout, me
from src.core.auth import get_current_user
from src.core.config import Settings, settings
from src.crud.project_crud import ProjectCrud
from src.crud.user_crud import UserCrud
from src.db.db_context import DBContext
from src.redis_client.client import get_redis_client
from src.schemas.project import Criteria, ProjectCreate
from src.schemas.user import ConsentAccept, UserCreate, UserRead
from src.services.user_service import create_user_service


def make_request(cookies: dict = {}):
    cookie_header = "; ".join(f"{k}={v}" for k, v in cookies.items())
    headers = {"cookie": cookie_header} if cookies else {}
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/",
        "query_string": b"",
        "headers": Headers(headers=headers).raw,
    }
    return Request(scope)


@pytest.mark.asyncio
async def test_unauthenticated_request(db_ctx: DBContext):
    request = make_request()
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(request, db_ctx, get_redis_client())
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_invalid_session(db_ctx: DBContext):
    session_id = str(uuid.uuid4())
    session_data = json.dumps(
        {
            "user_uuid": str(uuid.uuid4()),
        }
    )
    redis_client = get_redis_client()
    await redis_client.setex(
        f"session:{session_id}",
        settings.ACCESS_TOKEN_EXPIRE_SECONDS,
        session_data,
    )
    request = make_request(cookies={"session_id": session_id})
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(request, db_ctx, redis_client)
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_valid_session_returns_user(db_ctx: DBContext):
    user_crud = db_ctx.crud(UserCrud)
    user = await user_crud.create_user(
        UserCreate(
            sub="session-test-user",
            email="s@test.com",
            terms_version_accepted=settings.CURRENT_TERMS_VERSION,
            privacy_policy_version_accepted=settings.CURRENT_PRIVACY_POLICY_VERSION,
        )
    )
    await db_ctx.commit()

    session_id = str(uuid.uuid4())
    session_data = json.dumps(
        {
            "user_uuid": str(user.uuid),
        }
    )
    redis_client = get_redis_client()
    await redis_client.setex(
        f"session:{session_id}",
        settings.ACCESS_TOKEN_EXPIRE_SECONDS,
        session_data,
    )
    request = make_request(cookies={"session_id": session_id})
    result = await get_current_user(request, db_ctx, redis_client)
    assert result.uuid == user.uuid


@pytest.mark.asyncio
async def test_create_user_with_consent(db_ctx: DBContext):
    service = create_user_service(db_ctx)
    consent = ConsentAccept(terms=True, privacy_policy=True, research=True)
    user = await service.create_user_with_consent(
        sub="new-user", email="new@test.com", consent=consent
    )

    assert isinstance(user, UserRead)
    assert user.sub == "new-user"
    assert user.email == "new@test.com"
    assert user.consent_anonymized_research_usage is True


@pytest.mark.asyncio
async def test_create_user_with_consent_research_optional(db_ctx: DBContext):
    service = create_user_service(db_ctx)
    consent = ConsentAccept(terms=True, privacy_policy=True, research=None)
    user = await service.create_user_with_consent(
        sub="no-research-user", email="nr@test.com", consent=consent
    )

    assert user.consent_anonymized_research_usage is None


@pytest.mark.asyncio
async def test_users_only_see_their_own_projects(db_ctx: DBContext):
    user_crud = db_ctx.crud(UserCrud)
    project_crud = db_ctx.crud(ProjectCrud)

    user_a = await user_crud.create_user(UserCreate(sub="user-a", email="a@test.com"))
    user_b = await user_crud.create_user(UserCreate(sub="user-b", email="b@test.com"))

    for i in range(1, 4):
        await project_crud.create_project(
            ProjectCreate(
                name=f"User A Project {i}",
                owner_uuid=user_a.uuid,
                criteria=Criteria(inclusion_criteria=["A"], exclusion_criteria=["B"]),
            )
        )

    for i in range(1, 3):
        await project_crud.create_project(
            ProjectCreate(
                name=f"User B Project {i}",
                owner_uuid=user_b.uuid,
                criteria=Criteria(inclusion_criteria=["A"], exclusion_criteria=["B"]),
            )
        )

    projects_a = await project_crud.fetch_projects(user_a.uuid)
    projects_b = await project_crud.fetch_projects(user_b.uuid)

    assert len(projects_a) == 3
    assert len(projects_b) == 2

    uuids_a = {p.uuid for p in projects_a}
    uuids_b = {p.uuid for p in projects_b}
    assert uuids_a.isdisjoint(uuids_b)


@pytest.mark.asyncio
async def test_local_env_returns_mock_user_without_session(
    db_ctx: DBContext, monkeypatch
):
    monkeypatch.setattr(settings, "LOCAL_ENV", True)
    request = make_request()

    user = await get_current_user(request, db_ctx, get_redis_client())

    assert user.sub == settings.LOCAL_USER_SUB
    assert user.uuid == settings.LOCAL_USER_UUID
    assert user.terms_version_accepted == settings.CURRENT_TERMS_VERSION
    assert (
        user.privacy_policy_version_accepted == settings.CURRENT_PRIVACY_POLICY_VERSION
    )
    again = await get_current_user(request, db_ctx, get_redis_client())
    assert again.uuid == user.uuid


@pytest.mark.asyncio
async def test_local_env_recreates_deleted_mock_user_with_same_uuid(
    db_ctx: DBContext, monkeypatch
):
    monkeypatch.setattr(settings, "LOCAL_ENV", True)
    request = make_request()
    user = await get_current_user(request, db_ctx, get_redis_client())

    await create_user_service(db_ctx).delete_user(str(user.uuid))
    await db_ctx.commit()

    recreated = await get_current_user(request, db_ctx, get_redis_client())
    assert recreated.sub == settings.LOCAL_USER_SUB
    assert recreated.uuid == settings.LOCAL_USER_UUID


@pytest.mark.unit
def test_local_env_is_rejected_on_staging(monkeypatch):
    monkeypatch.setenv("LOCAL_ENV", "true")
    monkeypatch.setenv("APP_ENV", "staging")

    with pytest.raises(Exception, match="LOCAL_ENV"):
        Settings()


@pytest.mark.unit
def test_local_env_is_allowed_in_production(monkeypatch):
    monkeypatch.setenv("LOCAL_ENV", "true")
    monkeypatch.setenv("APP_ENV", "prod")

    assert Settings().LOCAL_ENV is True


@pytest.mark.asyncio
async def test_local_env_me_reports_local_mode(db_ctx: DBContext, monkeypatch):
    monkeypatch.setattr(settings, "LOCAL_ENV", True)
    user = await get_current_user(make_request(), db_ctx, get_redis_client())

    result = await me(user)

    assert result.local_mode is True


@pytest.mark.asyncio
async def test_local_env_disables_account_deletion_and_logout(
    db_ctx: DBContext, monkeypatch
):
    monkeypatch.setattr(settings, "LOCAL_ENV", True)
    request = make_request()
    redis_client = get_redis_client()
    user = await get_current_user(request, db_ctx, redis_client)

    with pytest.raises(HTTPException) as exc_info:
        await delete_account(request, db_ctx, user, redis_client)
    assert exc_info.value.status_code == 403
    assert await db_ctx.crud(UserCrud).get_user_by_uuid(str(user.uuid)) is not None

    with pytest.raises(HTTPException) as exc_info:
        await logout(request, redis_client)
    assert exc_info.value.status_code == 403
