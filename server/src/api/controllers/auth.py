import uuid
import json

from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends, HTTPException, status
from starlette.requests import Request
from starlette.responses import RedirectResponse, JSONResponse

from src.core.auth import get_current_user
from src.core.config import settings
from src.db.db_context import DBContext, get_db_ctx
from src.db.models.user import User
from src.schemas.user import UserRead
from src.services.user_service import create_user_service
from src.redis_client.client import get_redis_client

router = APIRouter(tags=["Auth"])

oauth = OAuth()
oauth.register(
    name="helsinki",
    server_metadata_url=f"{settings.OIDC_ISSUER_URL}/.well-known/openid-configuration",
    client_id=settings.OIDC_CLIENT_ID,
    client_secret=settings.OIDC_CLIENT_SECRET,
    client_kwargs={"scope": "openid email profile"},
)


@router.get("/auth/login")
async def login(request: Request):
    return await oauth.helsinki.authorize_redirect(request, settings.OIDC_REDIRECT_URI)


@router.get("/auth/callback")
async def callback(request: Request, db_ctx: DBContext = Depends(get_db_ctx)):
    try:
        token = await oauth.helsinki.authorize_access_token(request)
        userinfo = token.get("userinfo")
        access_token = token.get("access_token")

        user_service = create_user_service(db_ctx)
        user = await user_service.get_or_create_user(
            sub=userinfo.get("sub"),
            email=userinfo.get("email"),
            name=userinfo.get("name"),
        )
        await db_ctx.commit()

        session_id = str(uuid.uuid4())
        session_data = json.dumps({
            "access_token": access_token,
            "user_uuid": str(user.uuid),
        })

        redis_client = get_redis_client()
        await redis_client.setex(
            f"session:{session_id}",
            settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            session_data,
        )

        response = RedirectResponse(url=settings.FRONTEND_URL)
        response.set_cookie(
            key="session_id",
            value=session_id,
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )
        return response

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication failed: {str(e)}",
        )


@router.get("/auth/me", status_code=status.HTTP_200_OK, response_model=UserRead)
async def me(current_user: User = Depends(get_current_user)):
    return UserRead.model_validate(current_user)


@router.post("/auth/logout", status_code=status.HTTP_200_OK)
async def logout(request: Request):
    session_id = request.cookies.get("session_id")
    if session_id:
        redis_client = get_redis_client()
        await redis_client.delete(f"session:{session_id}")
    response = JSONResponse(content={"detail": "Logged out successfully"})
    response.delete_cookie(key="session_id")
    return response
