import uuid
from uuid import UUID as PyUUID

from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.db.session import Base

from .mixins import TimestampMixin


class Setting(Base, TimestampMixin):
    __tablename__ = "setting"
    __table_args__ = (UniqueConstraint("owner_uuid", "name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    uuid: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False
    )
    owner_uuid: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("user.uuid", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(1024), nullable=False)
    value: Mapped[str] = mapped_column(String(1024), nullable=True)
    secret: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
