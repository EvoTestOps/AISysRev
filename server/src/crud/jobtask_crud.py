from src.models.jobtask import JobTask
from sqlalchemy.ext.asyncio import AsyncSession

class JobTaskCrud:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def bulk_create_jobtasks(self, jobtasks: list):
        db_objs = [JobTask(**task.model_dump()) for task in jobtasks]
        async with self.db.begin():
            self.db.add_all(db_objs)
        await self.db.commit()
        return db_objs