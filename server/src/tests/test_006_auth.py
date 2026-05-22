import json
import uuid

import pytest
from fastapi import HTTPException
from starlette.requests import Request
from starlette.datastructures import Headers

from src.core.auth import get_current_user
from src.core.config import settings
from src.crud.project_crud import ProjectCrud
from src.crud.user_crud import UserCrud
from src.redis_client.client import get_redis_client
from src.schemas.project import Criteria, ProjectCreate
from src.schemas.user import UserCreate, UserRead
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
async def test_unauthenticated_request(db_ctx):
    request = make_request()
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(request, db_ctx)
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_invalid_session(db_ctx):
    session_id = str(uuid.uuid4())
    session_data = json.dumps({
        "access_token": "test-token",
        "user_uuid": str(uuid.uuid4()),
    })
    redis_client = get_redis_client()
    await redis_client.setex(
        f"session:{session_id}",
        settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        session_data,
    )
    request = make_request(cookies={"session_id": session_id})
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(request, db_ctx)
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_valid_session_returns_user(db_ctx):
    user_crud = db_ctx.crud(UserCrud)
    user = await user_crud.create_user(UserCreate(sub="session-test-user", email="s@test.com"))
    await db_ctx.commit()

    session_id = str(uuid.uuid4())
    session_data = json.dumps({
        "access_token": "test-token",
        "user_uuid": str(user.uuid),
    })
    redis_client = get_redis_client()
    await redis_client.setex(
        f"session:{session_id}",
        settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        session_data,
    )
    request = make_request(cookies={"session_id": session_id})
    result = await get_current_user(request, db_ctx)
    assert result.uuid == user.uuid


@pytest.mark.asyncio
async def test_get_or_create_user_creates_new_user(db_ctx):
    service = create_user_service(db_ctx)
    user = await service.get_or_create_user(sub="new-user", email="new@test.com")
    await db_ctx.commit()

    assert isinstance(user, UserRead)
    assert user.sub == "new-user"
    assert user.email == "new@test.com"


@pytest.mark.asyncio
async def test_get_or_create_user_returns_existing_user(db_ctx):
    service = create_user_service(db_ctx)
    user_first = await service.get_or_create_user(sub="existing-user", email="e@test.com")
    await db_ctx.commit()

    user_second = await service.get_or_create_user(sub="existing-user", email="e@test.com")

    assert user_first.uuid == user_second.uuid


@pytest.mark.asyncio
async def test_users_only_see_their_own_projects(db_ctx):
    user_crud = db_ctx.crud(UserCrud)
    project_crud = db_ctx.crud(ProjectCrud)

    user_a = await user_crud.create_user(UserCreate(sub="user-a", email="a@test.com"))
    user_b = await user_crud.create_user(UserCreate(sub="user-b", email="b@test.com"))

    for i in range(1, 4):
        await project_crud.create_project(ProjectCreate(
            name=f"User A Project {i}",
            owner_uuid=user_a.uuid,
            criteria=Criteria(inclusion_criteria=["A"], exclusion_criteria=["B"]),
        ))

    for i in range(1, 3):
        await project_crud.create_project(ProjectCreate(
            name=f"User B Project {i}",
            owner_uuid=user_b.uuid,
            criteria=Criteria(inclusion_criteria=["A"], exclusion_criteria=["B"]),
        ))

    projects_a = await project_crud.fetch_projects(user_a.uuid)
    projects_b = await project_crud.fetch_projects(user_b.uuid)

    assert len(projects_a) == 3
    assert len(projects_b) == 2

    uuids_a = {p.uuid for p in projects_a}
    uuids_b = {p.uuid for p in projects_b}
    assert uuids_a.isdisjoint(uuids_b)
