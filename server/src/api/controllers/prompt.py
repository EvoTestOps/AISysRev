from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from src.core.auth import get_current_user
from src.db.db_context import DBContext, get_db_ctx
from src.db.models.user import User
from src.schemas.job import JobPromptingType
from src.schemas.project import ScreeningTarget
from src.schemas.prompt import (
    PromptCreateRequest,
    PromptDetail,
    PromptRead,
    PromptUpdateRequest,
    PromptVariablesResponse,
    PromptVersionCreateRequest,
)
from src.services.prompt_service import (
    PromptNotFoundError,
    PromptReadOnlyError,
    create_prompt_service,
    prompt_variables,
)

router = APIRouter()


def _http_error(e: ValueError) -> HTTPException:
    if isinstance(e, PromptNotFoundError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    if isinstance(e, PromptReadOnlyError):
        return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(e)
    )


@router.get(
    "/prompt",
    status_code=status.HTTP_200_OK,
    response_model=list[PromptRead],
    tags=["Prompts"],
)
async def list_prompts(
    prompting_type: Optional[JobPromptingType] = None,
    screening_target: Optional[ScreeningTarget] = None,
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    """The built-in prompts and the user's own, the built-in ones first."""
    return await create_prompt_service(db_ctx).list_prompts(
        current_user.uuid, prompting_type, screening_target
    )


@router.get(
    "/prompt/variables",
    status_code=status.HTTP_200_OK,
    response_model=PromptVariablesResponse,
    tags=["Prompts"],
)
async def get_prompt_variables(current_user: User = Depends(get_current_user)):
    """The {{variables}} a prompt can use, and which each prompting type needs."""
    return prompt_variables()


@router.get(
    "/prompt/{uuid}",
    status_code=status.HTTP_200_OK,
    response_model=PromptDetail,
    tags=["Prompts"],
)
async def get_prompt(
    uuid: UUID,
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    try:
        return await create_prompt_service(db_ctx).get_prompt(uuid, current_user.uuid)
    except ValueError as e:
        raise _http_error(e)


@router.post(
    "/prompt",
    status_code=status.HTTP_201_CREATED,
    response_model=PromptDetail,
    tags=["Prompts"],
)
async def create_prompt(
    data: PromptCreateRequest,
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    detail = await create_prompt_service(db_ctx).create_prompt(current_user.uuid, data)
    await db_ctx.commit()
    return detail


@router.patch(
    "/prompt/{uuid}",
    status_code=status.HTTP_200_OK,
    response_model=PromptDetail,
    tags=["Prompts"],
)
async def update_prompt(
    uuid: UUID,
    data: PromptUpdateRequest,
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    """Renames a prompt or changes its description; neither makes a new version."""
    try:
        detail = await create_prompt_service(db_ctx).update_prompt(
            uuid, current_user.uuid, data
        )
    except ValueError as e:
        raise _http_error(e)
    await db_ctx.commit()
    return detail


@router.post(
    "/prompt/{uuid}/version",
    status_code=status.HTTP_201_CREATED,
    response_model=PromptDetail,
    tags=["Prompts"],
)
async def create_prompt_version(
    uuid: UUID,
    data: PromptVersionCreateRequest,
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    """Saves a new version of the prompt's text."""
    try:
        detail = await create_prompt_service(db_ctx).add_version(
            uuid, current_user.uuid, data
        )
    except ValueError as e:
        raise _http_error(e)
    await db_ctx.commit()
    return detail


@router.delete("/prompt/{uuid}", status_code=status.HTTP_200_OK, tags=["Prompts"])
async def delete_prompt(
    uuid: UUID,
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    """Hides the prompt; jobs that used it keep their record of it."""
    try:
        await create_prompt_service(db_ctx).archive_prompt(uuid, current_user.uuid)
    except ValueError as e:
        raise _http_error(e)
    await db_ctx.commit()
    return {"detail": "Deleted successfully"}
