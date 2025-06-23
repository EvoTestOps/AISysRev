import uuid
from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from src.db.session import Base
from .mixins import TimestampMixin

class Project(Base, TimestampMixin):
    __tablename__ = 'project'

    id = Column(Integer, primary_key=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    inclusion_criteria = Column(Text, nullable=False)
    exclusion_criteria = Column(Text, nullable=False)
