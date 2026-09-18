import json

import redis.asyncio as redis
from fastapi import Depends, HTTPException, status
from starlette.requests import Request

from src.core.config import settings
from src.crud.user_crud import UserCrud
from src.db.db_context import DBContext, get_db_ctx
from src.db.models.user import User
from src.redis_client.client import get_shared_redis_client


async def _resolve_current_user(
    db_ctx: DBContext,
    request: Request,
    redis_client: redis.Redis,
) -> User:
    session_id = request.cookies.get("session_id")
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )
    session_data = await redis_client.get(f"session:{session_id}")
    if not session_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired"
        )

    data = json.loads(session_data)

    if "pending_sub" in data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Consent required"
        )

    crud = db_ctx.crud(UserCrud)
    user = await crud.get_user_by_uuid(data.get("user_uuid"))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )

    if (
        user.terms_version_accepted != settings.CURRENT_TERMS_VERSION
        or user.privacy_policy_version_accepted
        != settings.CURRENT_PRIVACY_POLICY_VERSION
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Consent required"
        )

    return user


async def get_current_user(
    request: Request,
    db_ctx: DBContext = Depends(get_db_ctx),
    redis_client: redis.Redis = Depends(get_shared_redis_client),
) -> User:
    return await _resolve_current_user(db_ctx, request, redis_client)


async def get_current_user_without_held_db_session(
    request: Request,
    redis_client: redis.Redis = Depends(get_shared_redis_client),
) -> User:
    """Like get_current_user, but the DB session is closed immediately
    instead of being held open for the lifetime of the response.

    FastAPI only tears down a Depends(get_db_ctx) session after the *entire*
    response finishes -- for a StreamingResponse (e.g. Server-Sent Events),
    that means the connection's session stays open, idle in a transaction,
    for as long as the stream stays open. Use this dependency for such
    long-lived responses instead of get_current_user.
    """
    async with DBContext() as db_ctx:
        return await _resolve_current_user(db_ctx, request, redis_client)
