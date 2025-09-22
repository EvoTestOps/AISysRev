import enum
import uuid
from sqlalchemy import Column, Enum, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from src.db.session import Base
from .mixins import TimestampMixin


class JobPromptingType(enum.Enum):
    ZERO_SHOT = "ZERO_SHOT"
    ONE_SHOT = "ONE_SHOT"
    FEW_SHOT = "FEW_SHOT"


class Job(Base, TimestampMixin):
    __tablename__ = "job"

    id = Column(Integer, primary_key=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False)
    project_id = Column(
        Integer, ForeignKey("project.id", ondelete="CASCADE"), nullable=False
    )
    llm_config = Column(JSONB, nullable=False)
    prompting_config = Column(JSONB, nullable=False)
