import enum
import uuid
from uuid import UUID as PyUUID
from sqlalchemy import (
    Text,
    ForeignKey,
    Enum as SAEnum,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from src.schemas.jobtask import JobTaskHumanResult, JobTaskStatus
from src.db.session import Base
from .mixins import TimestampMixin


class Status(enum.Enum):
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

    id: Mapped[int] = mapped_column(primary_key=True)

    uuid: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        default=uuid.uuid4,
        unique=True,
        nullable=False,
    )

    job_id: Mapped[int] = mapped_column(
        ForeignKey("job.id", ondelete="CASCADE"),
        nullable=False,
    )

    doi: Mapped[str | None] = mapped_column(Text, nullable=True)

    title: Mapped[str] = mapped_column(Text, nullable=False)

    abstract: Mapped[str] = mapped_column(Text, nullable=False)

    paper_uuid: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("paper.uuid", ondelete="CASCADE"),
        nullable=False,
    )

    result: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    human_result: Mapped[JobTaskHumanResult | None] = mapped_column(
        SAEnum(HumanResult, name="humanresult"),
        nullable=True,
    )

    status: Mapped[JobTaskStatus] = mapped_column(
        SAEnum(Status, name="jobtaskstatus"),
        default=Status.NOT_STARTED,
        nullable=False,
    )

    status_metadata: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    error: Mapped[str] = mapped_column(Text, nullable=True)
