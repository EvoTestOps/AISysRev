from sqlalchemy.ext.asyncio import AsyncSession
from models.file import File
from schemas.file_create import FileCreate

async def create_file_record(db: AsyncSession, file_data: FileCreate):
    new_file = File(**file_data.model_dump(exclude_none=True))
    db.add(new_file)
    await db.commit()
    await db.refresh(new_file)
    return new_file
