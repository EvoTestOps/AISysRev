import enum
import uuid
from uuid import UUID as PyUUID
from sqlalchemy import (
    Text,
    ForeignKey,
    UniqueConstraint,
    Enum as SAEnum,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.db.session import Base
from .mixins import TimestampMixin


class HumanResult(enum.Enum):
    INCLUDE = "INCLUDE"
    EXCLUDE = "EXCLUDE"
    UNSURE = "UNSURE"


class Paper(Base, TimestampMixin):
    __tablename__ = "paper"

    id: Mapped[int] = mapped_column(primary_key=True)

    uuid: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        default=uuid.uuid4,
        unique=True,
        nullable=False,
    )

    paper_id: Mapped[int] = mapped_column(nullable=False)

    project_uuid: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("project.uuid", ondelete="CASCADE"),
        nullable=False,
    )

    file_uuid: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("file.uuid", ondelete="CASCADE"),
        nullable=False,
    )

    doi: Mapped[str | None] = mapped_column(Text, nullable=True)

    title: Mapped[str] = mapped_column(Text, nullable=False)

    abstract: Mapped[str] = mapped_column(Text, nullable=False)

    human_result: Mapped[HumanResult | None] = mapped_column(
        SAEnum(HumanResult, name="human_result"),
        nullable=True,
    )

    embedding_vector: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    classification_cache: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    __table_args__ = (
        UniqueConstraint("project_uuid", "paper_id", name="uq_project_paper_id"),
    )
