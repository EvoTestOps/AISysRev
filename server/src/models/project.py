import uuid
from sqlalchemy import Column, Integer, String
from sqlalchemy.dialects.postgresql import UUID, JSONB
from src.db.session import Base
from .mixins import TimestampMixin

class Project(Base, TimestampMixin):
    __tablename__ = 'project'

    id = Column(Integer, primary_key=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    criteria = Column(JSONB, nullable=False)
