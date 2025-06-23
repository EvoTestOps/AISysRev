import uuid
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from src.db.session import Base
from .mixins import TimestampMixin

class File(Base, TimestampMixin):
    __tablename__ = 'file'

    id = Column(Integer, primary_key=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False)
    project_id = Column(Integer, ForeignKey("project.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)
    mime_type = Column(String(255), nullable=False)
