from pydantic import BaseModel, ValidationError, field_validator
import csv


class Publication(BaseModel):
    title: str
    abstract: str
    doi: str

    @field_validator('title', 'abstract', 'doi')
    @classmethod
    def check_not_empty(cls, v, field):
        if not isinstance(v, str) or not str(v).strip():
            raise ValueError(f"Column {field.field_name} must be a non-empty string!")

def validate_csv(file_obj, filename: str):
    reader = csv.DictReader(
        file_obj.read().decode("utf-8").splitlines(),
        fieldnames=["title", "abstract", "doi"]
    )
    errors = []

    for idx, row in enumerate(reader):
        try:
            Publication(**row)
        except ValidationError as e:
            for err in e.errors():
                errors.append({
                    "file": filename,
                    "row": idx,
                    "message": err["msg"]
                })

    return errors
