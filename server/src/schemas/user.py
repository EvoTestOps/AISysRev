import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class UserCreate(BaseModel):
    sub: str
    email: Optional[str] = None
    terms_version_accepted: Optional[str] = None
    terms_accepted_at: Optional[datetime.datetime] = None
    privacy_policy_version_accepted: Optional[str] = None
    privacy_policy_accepted_at: Optional[datetime.datetime] = None
    consent_anonymized_research_usage: Optional[bool] = None
    consent_anonymized_research_usage_updated_at: Optional[datetime.datetime] = None


class ConsentAccept(BaseModel):
    terms: bool
    privacy_policy: bool
    research: Optional[bool] = None


class ResearchConsentUpdate(BaseModel):
    research: bool


class UserRead(BaseModel):
    uuid: UUID
    sub: str
    email: Optional[str] = None
    consent_anonymized_research_usage: Optional[bool] = None

    model_config = ConfigDict(from_attributes=True)
