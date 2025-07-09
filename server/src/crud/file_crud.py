from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.file import File
from src.schemas.file import FileCreate, FileRead

async def create_file_record(db: AsyncSession, file_data: FileCreate):
    new_file = File(**file_data.model_dump(exclude_none=True))
    db.add(new_file)
    await db.commit()
    await db.refresh(new_file)
    return new_file

async def fetch_files(db: AsyncSession, project_uuid: UUID) -> FileRead:
    stmt = select(File).where(File.project_uuid == project_uuid)
    result = db.execute(stmt)
    return result.mappings().all()