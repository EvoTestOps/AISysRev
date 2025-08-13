import uuid
from sqlalchemy import Column, Integer, Text, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from src.db.session import Base
from .mixins import TimestampMixin

class Paper(Base, TimestampMixin):
    __tablename__ = 'paper'

    id = Column(Integer, primary_key=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False)
    paper_id = Column(Integer, nullable=False)
    job_id = Column(Integer, ForeignKey("job.id", ondelete="CASCADE"), nullable=False)
    file_uuid = Column(UUID(as_uuid=True), nullable=False)
    doi = Column(Text, nullable=False)
    title = Column(Text, nullable=False)
    abstract = Column(Text, nullable=False)

    __table_args__ = (
        UniqueConstraint('job_id', 'paper_id', name='uq_job_paper_id'),
    )
