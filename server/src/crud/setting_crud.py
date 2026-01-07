from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.setting import Setting
from src.schemas.setting import SettingCreate, SettingRead


class SettingCrud:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def fetch_settings(self) -> List[SettingRead]:
        stmt = select(Setting.uuid, Setting.name, Setting.value, Setting.secret)
        settings = await self.db.execute(stmt)
        return [SettingRead.model_validate(s) for s in settings]

    async def fetch_setting(self, name: str) -> Optional[SettingRead]:
        stmt = select(Setting.uuid, Setting.name, Setting.value, Setting.secret).where(
            Setting.name == name
        )
        result = await self.db.execute(stmt)
        row = result.mappings().one_or_none()
        return SettingRead(**row) if row else None

    async def upsert_setting(self, setting_data: SettingCreate) -> Tuple[int, UUID]:
        stmt = (
            insert(Setting)
            .values(
                name=setting_data.name,
                value=setting_data.value,
                secret=setting_data.secret,
            )
            .on_conflict_do_update(
                index_elements=[Setting.name],
                set_={
                    "value": setting_data.value,
                    "secret": setting_data.secret,
                },
            )
            .returning(Setting.uuid)
        )

        result = await self.db.execute(stmt)
        return 1, result.scalar_one()
