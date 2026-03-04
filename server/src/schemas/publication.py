from typing import Optional
from pydantic import BaseModel, field_validator


class PublicationRowData(BaseModel):
    title: str
    abstract: Optional[str]
    doi: Optional[str]

    @field_validator("title")
    @classmethod
    def check_not_empty(cls, v, field):
        if not isinstance(v, str) or not str(v).strip():
            raise ValueError(f"Column {field.field_name} must be a non-empty string!")
        return v
