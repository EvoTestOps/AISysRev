from typing import Optional
from src.db.db_context import DBContext
from fastapi import Depends
from src.db.session import get_db
from src.crud.setting_crud import SettingCreate, SettingCrud, SettingRead
from sqlalchemy.ext.asyncio import AsyncSession
import logging

logger = logging.getLogger(__name__)


class SettingService:
    def __init__(self, setting_crud: SettingCrud):
        self.setting_crud = setting_crud

    async def get_setting(self, name: str, mask_secret=True) -> Optional[SettingRead]:
        setting = await self.setting_crud.fetch_setting(name)

        if not setting:
            return None
        setting_model = SettingRead.model_validate(setting)
        if setting_model.secret and mask_secret:
            return setting_model.model_copy(update={"value": "********************"})

        return setting_model

    async def upsert_setting(self, name: str, value: str, secret=True) -> str:
        affected_rows, uuid = await self.setting_crud.upsert_setting(
            SettingCreate(name=name, value=value, secret=secret)
        )

        return uuid


def create_setting_service(db_ctx: DBContext) -> SettingService:
    return SettingService(db_ctx.crud(SettingCrud))


def get_setting_service(db: AsyncSession = Depends(get_db)) -> SettingService:
    return SettingService(SettingCrud(db))
