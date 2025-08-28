from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from src.services.setting_service import SettingService, get_setting_service_fastapi

router = APIRouter()


@router.get("/setting", status_code=status.HTTP_200_OK)
async def get_setting(
    name: str, setting_service: SettingService = Depends(get_setting_service_fastapi)
):
    data = await setting_service.get_setting(name)

    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return data


class UpsertData(BaseModel):
    name: str
    value: str

@router.post("/setting", status_code=status.HTTP_201_CREATED)
async def upsert_setting(
    data: UpsertData,
    setting_service: SettingService = Depends(get_setting_service_fastapi),
):
    uuid = await setting_service.upsert_setting(data.name, data.value, True)

    return {"uuid": uuid}
