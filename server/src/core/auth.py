import json

from fastapi import Depends, HTTPException, status
from starlette.requests import Request

from src.crud.user_crud import UserCrud
from src.db.db_context import DBContext, get_db_ctx
from src.db.models.user import User
from src.redis_client.client import get_redis_client


async def get_current_user(
    request: Request, db_ctx: DBContext = Depends(get_db_ctx)
) -> User:
    session_id = request.cookies.get("session_id")
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )

    redis_client = get_redis_client()
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

    crud = UserCrud(db_ctx.session)
    user = await crud.get_user_by_uuid(data.get("user_uuid"))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )

    return user
