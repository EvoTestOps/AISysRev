import uuid
import json

from authlib.integrations.base_client import OAuthError
from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends, HTTPException, status
from starlette.requests import Request
from starlette.responses import RedirectResponse, JSONResponse

from src.core.auth import get_current_user
from src.core.config import settings
from src.crud.user_crud import UserCrud
from src.db.db_context import DBContext, get_db_ctx
from src.db.models.user import User
from src.schemas.user import ConsentAccept, ResearchConsentUpdate, UserRead
from src.services.user_service import create_user_service
from src.redis_client.client import get_shared_redis_client
import redis.asyncio as redis

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
async def callback(
    request: Request,
    db_ctx: DBContext = Depends(get_db_ctx),
    redis_client: redis.Redis = Depends(get_shared_redis_client),
):
    try:
        token = await oauth.helsinki.authorize_access_token(request)
        userinfo = token.get("userinfo")
        sub = userinfo.get("sub")
        email = userinfo.get("email")

        user_crud = db_ctx.crud(UserCrud)
        existing_user = await user_crud.get_user_by_sub(sub)

        if existing_user:
            session_data = json.dumps({"user_uuid": str(existing_user.uuid)})
        else:
            #New sign in: A user is created only after giving consent to the terms and privacy policy. 
            #Until then, the sub and email are stored in Redis with a temporary session ID.
            session_data = json.dumps({"pending_sub": sub, "pending_email": email})

        session_id = str(uuid.uuid4())
        await redis_client.setex(
            f"session:{session_id}",
            settings.ACCESS_TOKEN_EXPIRE_SECONDS,
            session_data,
        )

        response = RedirectResponse(url=settings.FRONTEND_URL)
        response.set_cookie(
            key="session_id",
            value=session_id,
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=settings.ACCESS_TOKEN_EXPIRE_SECONDS,
        )
        return response

    except HTTPException:
        raise
    except OAuthError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Authentication failed: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication failed: {str(e)}",
        )


@router.post("/auth/consent", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def accept_consent(
    consent: ConsentAccept,
    request: Request,
    db_ctx: DBContext = Depends(get_db_ctx),
    redis_client: redis.Redis = Depends(get_shared_redis_client),
):
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
    pending_sub = data.get("pending_sub")
    if not pending_sub:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pending consent for this session",
        )

    if not (consent.terms and consent.privacy_policy):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Terms and Privacy Policy must be accepted",
        )

    user_service = create_user_service(db_ctx)
    user = await user_service.create_user_with_consent(
        sub=pending_sub,
        email=data.get("pending_email"),
        consent=consent,
    )
    await db_ctx.commit()

    await redis_client.setex(
        f"session:{session_id}",
        settings.ACCESS_TOKEN_EXPIRE_SECONDS,
        json.dumps({"user_uuid": str(user.uuid)}),
    )

    return user


@router.get("/auth/dev-login")
async def dev_login(
    request: Request,
    db_ctx: DBContext = Depends(get_db_ctx),
    redis_client: redis.Redis = Depends(get_shared_redis_client),
):
    if settings.APP_ENV not in ("dev", "test"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    sub = "dev-user"
    email = "dev@dev.local"

    user_crud = db_ctx.crud(UserCrud)
    existing_user = await user_crud.get_user_by_sub(sub)

    if existing_user:
        session_data = json.dumps({"user_uuid": str(existing_user.uuid)})
    else:
        session_data = json.dumps({"pending_sub": sub, "pending_email": email})

    session_id = str(uuid.uuid4())
    await redis_client.setex(
        f"session:{session_id}",
        settings.ACCESS_TOKEN_EXPIRE_SECONDS,
        session_data,
    )
    response = RedirectResponse(url=settings.FRONTEND_URL)
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        secure=settings.APP_ENV != "test",
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_SECONDS,
    )
    return response


@router.get("/auth/me", status_code=status.HTTP_200_OK, response_model=UserRead)
async def me(current_user: User = Depends(get_current_user)):
    return UserRead.model_validate(current_user)


@router.patch("/auth/me/research-consent", response_model=UserRead, status_code=status.HTTP_200_OK)
async def update_research_consent(
    body: ResearchConsentUpdate,
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    user_service = create_user_service(db_ctx)
    user = await user_service.update_research_consent(str(current_user.uuid), body.research)
    await db_ctx.commit()
    return user


@router.delete("/auth/me", status_code=status.HTTP_200_OK)
async def delete_account(
    request: Request,
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
    redis_client: redis.Redis = Depends(get_shared_redis_client),
):
    session_id = request.cookies.get("session_id")
    if session_id:
        await redis_client.delete(f"session:{session_id}")

    user_service = create_user_service(db_ctx)
    await user_service.delete_user(str(current_user.uuid))
    await db_ctx.commit()

    response = JSONResponse(content={"detail": "Account deleted successfully"})
    response.delete_cookie(key="session_id")
    return response


@router.get("/auth/logout")
async def logout(
    request: Request,
    redis_client: redis.Redis = Depends(get_shared_redis_client),
):
    session_id = request.cookies.get("session_id")
    if session_id:
        await redis_client.delete(f"session:{session_id}")
    response = RedirectResponse(url="/login")
    response.delete_cookie(key="session_id")
    return response
