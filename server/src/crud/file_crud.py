from typing import List
from uuid import UUID
from src.models.paper import Paper
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.file import File
from src.schemas.file import FileCreate, FileReadWithPaperCount


class FileCrud:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def fetch_files(self, project_uuid: UUID) -> List[FileReadWithPaperCount]:
        stmt = (
            select(
                File.uuid,
                File.project_uuid,
                File.filename,
                File.mime_type,
                func.count(Paper.uuid).label("paper_count"),
            )
            .select_from(File)
            .join(
                Paper,
                Paper.project_uuid == File.project_uuid,
                isouter=True,
            )
            .where(File.project_uuid == project_uuid)
            .group_by(
                File.uuid,
                File.project_uuid,
                File.filename,
                File.mime_type,
            )
        )
        result = await self.db.execute(stmt)
        return result.mappings().all()

    async def create_file_record(self, file_data: FileCreate):
        new_file = File(**file_data.model_dump(exclude_none=True))
        self.db.add(new_file)
        await self.db.flush()
        await self.db.refresh(new_file)
        return new_file
