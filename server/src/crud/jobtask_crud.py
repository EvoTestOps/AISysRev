from src.models.jobtask import JobTask
from sqlalchemy.ext.asyncio import AsyncSession

async def bulk_create_jobtasks(db: AsyncSession, jobtasks: list):
    db_objs = [JobTask(**task.model_dump()) for task in jobtasks]
    db.add_all(db_objs)
    await db.commit()
    return db_objs