from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.setting import Setting
from src.schemas.setting import SettingCreate, SettingRead


class SettingCrud:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def fetch_settings(self, owner_uuid: UUID) -> List[SettingRead]:
        stmt = select(Setting.uuid, Setting.name, Setting.value, Setting.secret).where(Setting.owner_uuid == owner_uuid)
        settings = await self.db.execute(stmt)
        return [SettingRead(**s) for s in settings.mappings().all()]

    async def fetch_setting(self, name: str, owner_uuid: UUID) -> Optional[SettingRead]:
        stmt = select(Setting.uuid, Setting.name, Setting.value, Setting.secret).where(
            Setting.name == name, Setting.owner_uuid == owner_uuid
        )
        result = await self.db.execute(stmt)
        row = result.mappings().one_or_none()
        return SettingRead(**row) if row else None

    async def delete_setting(self, name: str, owner_uuid: UUID) -> bool:
        stmt = select(Setting).where(Setting.name == name, Setting.owner_uuid == owner_uuid)
        result = await self.db.execute(stmt)
        row = result.scalar_one_or_none()
        if row is None:
            return False
        await self.db.delete(row)
        return True

    async def upsert_setting(self, setting_data: SettingCreate) -> Tuple[int, UUID]:
        stmt = (
            insert(Setting)
            .values(
                owner_uuid=setting_data.owner_uuid,
                name=setting_data.name,
                value=setting_data.value,
                secret=setting_data.secret,
            )
            .on_conflict_do_update(
                index_elements=["owner_uuid", "name"],
                set_={
                    "value": setting_data.value,
                    "secret": setting_data.secret,
                },
            )
            .returning(Setting.uuid)
        )

        result = await self.db.execute(stmt)
        return 1, result.scalar_one()
