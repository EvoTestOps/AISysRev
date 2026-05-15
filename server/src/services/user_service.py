from typing import Optional

from src.crud.user_crud import UserCrud
from src.db.db_context import DBContext
from src.schemas.user import UserCreate, UserRead


class UserService:
    def __init__(self, user_crud: UserCrud):
        self.user_crud = user_crud

    async def get_or_create_user(
        self, sub: str, email: Optional[str], name: Optional[str]
    ) -> UserRead:
        user = await self.user_crud.get_user_by_sub(sub)
        if not user:
            user = await self.user_crud.create_user(
                UserCreate(sub=sub, email=email, name=name)
            )
        return UserRead.model_validate(user)


def create_user_service(db_ctx: DBContext) -> UserService:
    return UserService(db_ctx.crud(UserCrud))
