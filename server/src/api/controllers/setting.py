from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from src.db.db_context import DBContext, get_db_ctx
from src.services.setting_service import create_setting_service

router = APIRouter()


@router.get("/setting", status_code=status.HTTP_200_OK)
async def get_setting(name: str, db_ctx: DBContext = Depends(get_db_ctx)):
    setting_service = create_setting_service(db_ctx)
    data = await setting_service.get_setting(name, mask_secret=True)

    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return data


class UpsertData(BaseModel):
    name: str
    value: str


@router.post("/setting", status_code=status.HTTP_201_CREATED)
async def upsert_setting(
    data: UpsertData,
    db_ctx: DBContext = Depends(get_db_ctx),
):

    setting_service = create_setting_service(db_ctx)
    uuid = await setting_service.upsert_setting(data.name, data.value, True)
    await db_ctx.commit()

    return {"uuid": uuid}
