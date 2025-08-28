import enum
import uuid
from sqlalchemy import Column, Integer, Text, ForeignKey, UniqueConstraint, Enum
from sqlalchemy.dialects.postgresql import UUID
from src.db.session import Base
from .mixins import TimestampMixin

class HumanResult(enum.Enum):
    INCLUDE = "INCLUDE"
    EXCLUDE = "EXCLUDE"
    UNSURE = "UNSURE"

class Paper(Base, TimestampMixin):
    __tablename__ = 'paper'

    id = Column(Integer, primary_key=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False)
    paper_id = Column(Integer, nullable=False)
    project_uuid = Column(UUID(as_uuid=True), ForeignKey("project.uuid", ondelete="CASCADE"), nullable=False)
    file_uuid = Column(UUID(as_uuid=True), ForeignKey("file.uuid", ondelete="CASCADE"), nullable=False)
    doi = Column(Text, nullable=False)
    title = Column(Text, nullable=False)
    abstract = Column(Text, nullable=False)
    human_result = Column(Enum(HumanResult, name="human_result"), nullable=True)

    __table_args__ = (
        UniqueConstraint('project_uuid', 'paper_id', name='uq_project_paper_id'),
    )
