import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.user import User
from src.schemas.user import UserCreate


class UserCrud:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_by_uuid(self, user_uuid: str) -> Optional[User]:
        stmt = select(User).where(User.uuid == user_uuid)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_user_by_sub(self, sub: str) -> Optional[User]:
        stmt = select(User).where(User.sub == sub)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create_user(self, user_data: UserCreate) -> User:
        user = User(**user_data.model_dump(exclude_none=True))
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def update_research_consent(
        self, user_uuid: str, value: bool
    ) -> Optional[User]:
        stmt = select(User).where(User.uuid == user_uuid)
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()
        if user:
            user.consent_anonymized_research_usage = value
            user.consent_anonymized_research_usage_updated_at = datetime.datetime.now(
                datetime.timezone.utc
            )
            await self.db.flush()
            await self.db.refresh(user)
        return user

    async def update_consent_versions(
        self,
        user_uuid: str,
        terms_version: str,
        privacy_policy_version: str,
        accepted_at: datetime.datetime,
    ) -> Optional[User]:
        stmt = select(User).where(User.uuid == user_uuid)
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()
        if user:
            user.terms_version_accepted = terms_version
            user.terms_accepted_at = accepted_at
            user.privacy_policy_version_accepted = privacy_policy_version
            user.privacy_policy_accepted_at = accepted_at
            await self.db.flush()
            await self.db.refresh(user)
        return user

    async def delete_user(self, user_uuid: str) -> bool:
        stmt = select(User).where(User.uuid == user_uuid)
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()
        if user:
            await self.db.delete(user)
            return True
        return False
