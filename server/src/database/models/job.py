import uuid
from sqlalchemy import Column, Integer, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from .base import Base
from .mixins import TimestampMixin

class Job(Base, TimestampMixin):
    __tablename__ = 'job'

    id = Column(Integer, primary_key=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False)
    project_id = Column(Integer, ForeignKey("project.id", ondelete="CASCADE"), nullable=False)
    model_config = Column(JSON, nullable=False)
