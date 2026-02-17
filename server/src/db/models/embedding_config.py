import uuid
from uuid import UUID as PyUUID
from sqlalchemy import Integer, String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from src.db.session import Base
from .mixins import TimestampMixin


class EmbeddingConfig(Base, TimestampMixin):
    __tablename__ = "embedding_config"

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
    prompt_prefix: Mapped[str | None] = mapped_column(Text, nullable=True)
    model_name: Mapped[str] = mapped_column(String(255), nullable=False)
