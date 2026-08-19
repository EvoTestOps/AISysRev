from uuid import UUID
from pydantic import BaseModel


class PdfChunkEmbeddingCreate(BaseModel):
    pdf_file_uuid: UUID
    chunk_index: int
    chunk_text: str
    embedding: list[float]