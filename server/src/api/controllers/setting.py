from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from src.core.auth import get_current_user
from src.db.db_context import DBContext, get_db_ctx
from src.db.models.user import User
from src.services.setting_service import create_setting_service

router = APIRouter()


@router.get("/setting", status_code=status.HTTP_200_OK, tags=["Settings"])
async def get_setting(
    name: str,
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    setting_service = create_setting_service(db_ctx)
    data = await setting_service.get_setting(name, owner_uuid=current_user.uuid, mask_secret=True)

    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return data


@router.delete("/setting", status_code=status.HTTP_200_OK, tags=["Settings"])
async def delete_setting(
    name: str,
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    setting_service = create_setting_service(db_ctx)
    deleted = await setting_service.delete_setting(name, owner_uuid=current_user.uuid)
    await db_ctx.commit()
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return {"detail": "Deleted successfully"}


class UpsertData(BaseModel):
    name: str = Field(max_length=1024)
    value: str = Field(max_length=1024)

    @field_validator("name", "value")
    @classmethod
    def non_empty(cls, v, field):
        if not v.strip():
            raise ValueError(f"{field.field_name} must be a non-empty string")
        return v

@router.post("/setting", status_code=status.HTTP_201_CREATED, tags=["Settings"])
async def upsert_setting(
    data: UpsertData,
    db_ctx: DBContext = Depends(get_db_ctx),
    current_user: User = Depends(get_current_user),
):
    setting_service = create_setting_service(db_ctx)
    uuid = await setting_service.upsert_setting(data.name, data.value, owner_uuid=current_user.uuid, secret=True)
    await db_ctx.commit()

    return {"uuid": uuid}
