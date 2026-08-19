import uuid
from uuid import UUID as PyUUID
from sqlalchemy import Integer, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from src.db.session import Base
from .mixins import TimestampMixin


class Project(Base, TimestampMixin):
    __tablename__ = "project"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    uuid: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False
    )
    owner_uuid: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("user.uuid", ondelete="CASCADE"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    criteria: Mapped[dict] = mapped_column(JSONB, nullable=False)
    preferences: Mapped[dict] = mapped_column(JSONB, nullable=True)
    inclusion_criteria_embedding: Mapped[list[float] | None] = mapped_column(JSONB, nullable=True)
    exclusion_criteria_embedding: Mapped[list[float] | None] = mapped_column(JSONB, nullable=True)
    screening_target: Mapped[str] = mapped_column(String(32), nullable=False, default="PAPER")
