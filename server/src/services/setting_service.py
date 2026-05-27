import logging
from typing import Optional
from uuid import UUID

from src.crud.setting_crud import SettingCrud
from src.db.db_context import DBContext
from src.schemas.setting import SettingCreate, SettingRead

logger = logging.getLogger(__name__)


class SettingService:
    def __init__(self, setting_crud: SettingCrud):
        self.setting_crud = setting_crud

    async def get_setting(self, name: str, owner_uuid: UUID, mask_secret=True) -> Optional[SettingRead]:
        setting = await self.setting_crud.fetch_setting(name, owner_uuid)

        if not setting:
            return None
        if setting.secret and mask_secret:
            return setting.model_copy(update={"value": "********************"})

        return setting

    async def upsert_setting(self, name: str, value: str, owner_uuid: UUID, secret=True) -> UUID:
        affected_rows, uuid = await self.setting_crud.upsert_setting(
            SettingCreate(name=name, value=value, owner_uuid=owner_uuid, secret=secret)
        )

        return uuid


def create_setting_service(db_ctx: DBContext) -> SettingService:
    return SettingService(db_ctx.crud(SettingCrud))
