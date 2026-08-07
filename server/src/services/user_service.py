import datetime
from typing import Optional

from src.core.config import settings
from src.crud.user_crud import UserCrud
from src.db.db_context import DBContext
from src.schemas.user import ConsentAccept, UserCreate, UserRead


class UserService:
    def __init__(self, user_crud: UserCrud):
        self.user_crud = user_crud

    async def update_research_consent(self, user_uuid: str, value: bool) -> UserRead:
        user = await self.user_crud.update_research_consent(user_uuid, value)
        if not user:
            raise ValueError("User not found")
        return UserRead.model_validate(user)

    async def update_consent_versions(self, user_uuid: str) -> UserRead:
        now = datetime.datetime.now(datetime.timezone.utc)
        user = await self.user_crud.update_consent_versions(
            user_uuid,
            terms_version=settings.CURRENT_TERMS_VERSION,
            privacy_policy_version=settings.CURRENT_PRIVACY_POLICY_VERSION,
            accepted_at=now,
        )
        if not user:
            raise ValueError("User not found")
        return UserRead.model_validate(user)

    async def delete_user(self, user_uuid: str) -> bool:
        return await self.user_crud.delete_user(user_uuid)

    async def create_user_with_consent(
        self, sub: str, email: Optional[str], consent: ConsentAccept
    ) -> UserRead:
        now = datetime.datetime.now(datetime.timezone.utc)
        user = await self.user_crud.create_user(
            UserCreate(
                sub=sub,
                email=email,
                terms_version_accepted=settings.CURRENT_TERMS_VERSION,
                terms_accepted_at=now,
                privacy_policy_version_accepted=settings.CURRENT_PRIVACY_POLICY_VERSION,
                privacy_policy_accepted_at=now,
                consent_anonymized_research_usage=consent.research,
                consent_anonymized_research_usage_updated_at=(
                    now if consent.research is not None else None
                ),
            )
        )
        return UserRead.model_validate(user)


def create_user_service(db_ctx: DBContext) -> UserService:
    return UserService(db_ctx.crud(UserCrud))
