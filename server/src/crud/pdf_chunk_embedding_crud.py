from typing import List, Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.file import File
from src.db.models.pdf_chunk_embedding import PdfChunkEmbedding
from src.db.models.project import Project
from src.schemas.pdf_chunk_embedding import PdfChunkEmbeddingCreate


class PdfChunkEmbeddingCrud:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def fetch_chunks_by_pdf_file_uuid(
        self, pdf_file_uuid: UUID, owner_uuid: UUID
    ) -> Sequence[PdfChunkEmbedding]:
        stmt = (
            select(PdfChunkEmbedding)
            .join(File, File.uuid == PdfChunkEmbedding.pdf_file_uuid)
            .join(Project, Project.uuid == File.project_uuid)
            .where(PdfChunkEmbedding.pdf_file_uuid == pdf_file_uuid)
            .where(Project.owner_uuid == owner_uuid)
            .order_by(PdfChunkEmbedding.chunk_index)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()
    
    async def bulk_create_chunks(
        self, chunks: List[PdfChunkEmbeddingCreate], owner_uuid: UUID
    ) -> Sequence[PdfChunkEmbedding]:
        if not chunks:
            return []
        stmt = (
            insert(PdfChunkEmbedding)
            .values([chunk.model_dump() for chunk in chunks])
            .on_conflict_do_nothing(index_elements=["pdf_file_uuid", "chunk_index"])
        )
        await self.db.execute(stmt)
        await self.db.flush()
        return await self.fetch_chunks_by_pdf_file_uuid(
            chunks[0].pdf_file_uuid, owner_uuid
        )