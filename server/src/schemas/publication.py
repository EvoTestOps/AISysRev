from pydantic import BaseModel, field_validator

class PublicationRowData(BaseModel):
    title: str
    abstract: str
    doi: str

    @field_validator('title', 'abstract', 'doi')
    @classmethod
    def check_not_empty(cls, v, field):
        if not isinstance(v, str) or not str(v).strip():
            raise ValueError(f"Column {field.field_name} must be a non-empty string!")
        return v
