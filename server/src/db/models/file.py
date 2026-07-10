import uuid
from uuid import UUID as PyUUID
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from src.db.session import Base
from .mixins import TimestampMixin


class File(Base, TimestampMixin):
    __tablename__ = "file"

    id = Column(Integer, primary_key=True)
    uuid: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False
    )
    project_uuid = Column(
        UUID(as_uuid=True),
        ForeignKey("project.uuid", ondelete="CASCADE"),
        nullable=False,
    )
    filename = Column(String(255), nullable=False)
    mime_type = Column(String(255), nullable=False)
    storage_path = Column(String(255), nullable=True)
