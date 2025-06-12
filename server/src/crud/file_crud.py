from sqlalchemy.ext.asyncio import AsyncSession
from models.file import File

async def create_file_record(file_data: dict, db: AsyncSession):
    new_file = File(**file_data)
    db.add(new_file)
    await db.commit()
    await db.refresh(new_file)
    return new_file
