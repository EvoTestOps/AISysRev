import enum
import uuid
from uuid import UUID as PyUUID
from sqlalchemy import (
    Text,
    ForeignKey,
    UniqueConstraint,
    CheckConstraint,
    Enum as SAEnum,
)
from sqlalchemy.dialects.postgresql import UUID
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
        nullable=True,
    )

    pdf_file_uuid: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("file.uuid", ondelete="CASCADE"),
        nullable=True,
    )

    doi: Mapped[str | None] = mapped_column(Text, nullable=True)

    title: Mapped[str] = mapped_column(Text, nullable=False)

    abstract: Mapped[str] = mapped_column(Text, nullable=False)

    human_result: Mapped[HumanResult | None] = mapped_column(
        SAEnum(HumanResult, name="human_result"),
        nullable=True,
    )

    __table_args__ = (
        UniqueConstraint("project_uuid", "paper_id", name="uq_project_paper_id"),
        CheckConstraint("file_uuid IS NOT NULL OR pdf_file_uuid IS NOT NULL", name="ck_paper_has_source_file"),
    )
