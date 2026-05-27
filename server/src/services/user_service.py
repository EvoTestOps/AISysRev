from typing import Optional

from src.crud.user_crud import UserCrud
from src.db.db_context import DBContext
from src.schemas.user import UserCreate, UserRead


class UserService:
    def __init__(self, user_crud: UserCrud):
        self.user_crud = user_crud

    async def delete_user(self, user_uuid: str) -> bool:
        return await self.user_crud.delete_user(user_uuid)

    async def get_or_create_user(
        self, sub: str, email: Optional[str]
    ) -> UserRead:
        user = await self.user_crud.get_user_by_sub(sub)
        if not user:
            user = await self.user_crud.create_user(
                UserCreate(sub=sub, email=email)
            )
        return UserRead.model_validate(user)


def create_user_service(db_ctx: DBContext) -> UserService:
    return UserService(db_ctx.crud(UserCrud))
