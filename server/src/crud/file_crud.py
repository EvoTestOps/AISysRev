from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.file import File
from src.schemas.file import FileCreate, FileRead

class FileCrud:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def fetch_files(self, project_uuid: UUID) -> FileRead:
        stmt = (
            select(
                File.uuid,
                File.project_uuid,
                File.filename,
                File.mime_type,
            )
            .where(File.project_uuid == project_uuid)
        )
        result = await self.db.execute(stmt)
        return result.mappings().all()

    async def create_file_record(self, file_data: FileCreate):
        new_file = File(**file_data.model_dump(exclude_none=True))
        self.db.add(new_file)
        await self.db.commit()
        await self.db.refresh(new_file)
        return new_file
