import uuid
import enum
from sqlalchemy import Column, Integer, String, Text, ForeignKey, JSON, Boolean, Enum
from sqlalchemy.dialects.postgresql import UUID
from .base import Base
from .mixins import TimestampMixin

class JobTaskStatus(enum.Enum):
    NOT_STARTED = "NOT_STARTED"
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    DONE = "DONE"
    ERROR = "ERROR"

class HumanResult(enum.Enum):
    BOOLEAN = "BOOLEAN"
    INCLUSION = "INCLUSION"
    EXCLUSION = "EXCLUSION"

class JobTask(Base, TimestampMixin):
    __tablename__ = 'jobtask'

    id = Column(Integer, primary_key=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False)
    job_id = Column(Integer, ForeignKey("job.id", ondelete="CASCADE"), nullable=False)
    paper_id = Column(String(255), nullable=False)
    title = Column(Text, nullable=False)
    abstract = Column(Text, nullable=False)
    result = Column(JSON, nullable=True)
    human_result = Column(Enum(HumanResult), nullable=True)
    status = Column(Enum(JobTaskStatus), default=JobTaskStatus.NOT_STARTED, nullable=False)
    status_metadata = Column(JSON, nullable=True)
