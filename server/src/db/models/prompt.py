import datetime
import uuid
from uuid import UUID as PyUUID

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.db.session import Base

from .mixins import TimestampMixin


class Prompt(Base, TimestampMixin):
    """A screening prompt; its text lives in its versions."""

    __tablename__ = "prompt"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    uuid: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False
    )
    # None for the built-in default prompts, which every account can use.
    owner_uuid: Mapped[PyUUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user.uuid", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    # Identifies a default prompt across releases; None for users' prompts.
    slug: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    prompting_type: Mapped[str] = mapped_column(String(32), nullable=False)
    screening_target: Mapped[str] = mapped_column(String(32), nullable=False)
    # Deleting a prompt archives it, so the jobs that used it can still name it.
    archived_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class PromptVersion(Base):
    """One saved text of a prompt. Versions are never changed once written."""

    __tablename__ = "prompt_version"
    __table_args__ = (UniqueConstraint("prompt_id", "version"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    uuid: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False
    )
    prompt_id: Mapped[int] = mapped_column(
        ForeignKey("prompt.id", ondelete="CASCADE"), nullable=False
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    system_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    user_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    change_note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
