import uuid
import enum
from sqlalchemy import Column, Integer, Text, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from src.db.session import Base
from .mixins import TimestampMixin


class JobTaskStatus(enum.Enum):
    NOT_STARTED = "NOT_STARTED"
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    DONE = "DONE"
    ERROR = "ERROR"


class HumanResult(enum.Enum):
    INCLUDE = "INCLUDE"
    EXCLUDE = "EXCLUDE"
    UNSURE = "UNSURE"


class JobTask(Base, TimestampMixin):
    __tablename__ = "jobtask"

    id = Column(Integer, primary_key=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False)
    job_id = Column(Integer, ForeignKey("job.id", ondelete="CASCADE"), nullable=False)
    doi = Column(Text, nullable=False)
    title = Column(Text, nullable=False)
    abstract = Column(Text, nullable=False)
    paper_uuid = Column(
        UUID, ForeignKey("paper.uuid", ondelete="CASCADE"), nullable=False
    )
    result = Column(JSONB, nullable=True)
    human_result = Column(Enum(HumanResult), nullable=True)
    status = Column(
        Enum(JobTaskStatus), default=JobTaskStatus.NOT_STARTED, nullable=False
    )
    status_metadata = Column(JSONB, nullable=True)
