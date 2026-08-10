from typing import List
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.file import File
from src.db.models.paper import Paper
from src.db.models.project import Project
from src.schemas.file import FileCreate, FileReadWithPaperCount


class FileCrud:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def fetch_files(self, project_uuid: UUID, owner_uuid: UUID) -> List[FileReadWithPaperCount]:
        stmt = (
            select(
                File.uuid,
                File.project_uuid,
                File.filename,
                File.mime_type,
                File.storage_path,
                func.count(Paper.uuid).label("paper_count"),
            )
            .select_from(File)
            .join(
                Paper,
                or_(Paper.file_uuid == File.uuid, Paper.pdf_file_uuid == File.uuid),
                isouter=True,
            )
            .join(Project, Project.uuid == File.project_uuid)
            .where(File.project_uuid == project_uuid)
            .where(Project.owner_uuid == owner_uuid)
            .group_by(
                File.uuid,
                File.project_uuid,
                File.filename,
                File.mime_type,
                File.storage_path,
            )
        )
        result = await self.db.execute(stmt)
        # TODO: Fix
        return result.mappings().all()  # type: ignore
    
    async def fetch_file_by_uuid(self, file_uuid: UUID, owner_uuid: UUID) -> File | None:
        stmt = (
            select(File)
            .join(Project, Project.uuid == File.project_uuid)
            .where(File.uuid == file_uuid)
            .where(Project.owner_uuid == owner_uuid)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create_file_record(self, file_data: FileCreate):
        new_file = File(**file_data.model_dump(exclude_none=True))
        self.db.add(new_file)
        await self.db.flush()
        await self.db.refresh(new_file)
        return new_file
    
    async def delete_file(self, file: File) -> None:
        await self.db.delete(file)
        await self.db.flush()

    async def fetch_storage_paths_by_project(self, project_uuid: UUID) -> List[str]:
        stmt = (
            select(File.storage_path)
            .where(File.project_uuid == project_uuid)
            .where(File.storage_path.is_not(None))
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_files_with_storage_path(self, storage_path: str) -> int:
        stmt = (
            select(func.count())
            .select_from(File)
            .where(File.storage_path == storage_path)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()
