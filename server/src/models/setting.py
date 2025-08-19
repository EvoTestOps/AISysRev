import uuid
from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.dialects.postgresql import UUID
from src.db.session import Base
from .mixins import TimestampMixin


class Setting(Base, TimestampMixin):
    __tablename__ = "setting"

    id = Column(Integer, primary_key=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False)
    name = Column(String(1024), nullable=False, unique=True)
    value = Column(String(1024))
    secret = Column(Boolean, default=False)
