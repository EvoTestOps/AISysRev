import uuid
from uuid import UUID as PyUUID

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.db.session import Base
from src.schemas.job import JobScreeningMode

from .mixins import TimestampMixin


class Job(Base, TimestampMixin):
    __tablename__ = "job"

    id: Mapped[int] = mapped_column(primary_key=True)
    uuid: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False
    )
    celery_task_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), nullable=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("project.id", ondelete="CASCADE"), nullable=False
    )
    llm_config: Mapped[dict] = mapped_column(JSONB, nullable=False)
    prompting_config: Mapped[dict] = mapped_column(JSONB, nullable=False)
    screening_mode: Mapped[JobScreeningMode] = mapped_column(
        SAEnum(JobScreeningMode, name="jobscreeningmode"),
        default=JobScreeningMode.TEXT,
        nullable=False,
    )
