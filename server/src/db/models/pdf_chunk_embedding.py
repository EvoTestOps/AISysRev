import uuid
from uuid import UUID as PyUUID

from sqlalchemy import ForeignKey, Integer, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.db.session import Base

from .mixins import TimestampMixin


class PdfChunkEmbedding(Base, TimestampMixin):
    __tablename__ = "pdf_chunk_embedding"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    uuid: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False
    )
    pdf_file_uuid: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("file.uuid", ondelete="CASCADE"), nullable=False
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    chunk_text: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[float]] = mapped_column(JSONB, nullable=False)

    __table_args__ = (
        UniqueConstraint("pdf_file_uuid", "chunk_index", name="uq_pdf_chunk_index"),
    )
