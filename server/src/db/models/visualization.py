import uuid
from uuid import UUID as PyUUID
from sqlalchemy import Integer, String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from src.db.session import Base
from .mixins import TimestampMixin


class Visualization(Base, TimestampMixin):
    __tablename__ = "visualization"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    uuid: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False
    )
    project_uuid: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("project.uuid", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    visualization_type: Mapped[str] = mapped_column(
        String(50), nullable=False, server_default="umap_embedding"
    )
    config: Mapped[dict] = mapped_column(JSONB, nullable=False)
    html_content: Mapped[str] = mapped_column(Text, nullable=False)
    source_job_uuid: Mapped[PyUUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
