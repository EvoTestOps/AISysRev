import uuid
import datetime
from uuid import UUID as PyUUID
from typing import Optional
from sqlalchemy import Integer, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from src.db.session import Base
from .mixins import TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "user"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    uuid: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False
    )
    sub: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    terms_version_accepted: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    terms_accepted_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    privacy_policy_version_accepted: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    privacy_policy_accepted_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    consent_anonymized_research_usage: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    consent_anonymized_research_usage_updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )