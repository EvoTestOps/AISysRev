import uuid
from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from src.db.session import Base
from .mixins import TimestampMixin

class Job(Base, TimestampMixin):
    __tablename__ = 'job'

    id = Column(Integer, primary_key=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False)
    project_id = Column(Integer, ForeignKey("project.id", ondelete="CASCADE"), nullable=False)
    llm_config = Column(JSONB, nullable=False)
