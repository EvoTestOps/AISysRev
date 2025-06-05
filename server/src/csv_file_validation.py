from pydantic import BaseModel, ValidationError, field_validator
import csv


class Publication(BaseModel):
    title: str
    abstract: str
    doi: str

    @field_validator('title', 'abstract', 'doi')
    @classmethod
    def check_not_empty(cls, v, field):
        if v is None or not str(v).strip():
            raise ValueError(f"Column {field.field_name} is empty!")



def validate_csv(file_obj, filename: str):
    reader = csv.DictReader(
        file_obj.read().decode("utf-8").splitlines(),
        fieldnames=["title", "abstract", "doi"]
    )
    errors = []

    for idx, row in enumerate(reader):
        try:
            Publication(**row)
            print("No error!")
        except ValidationError as e:
            print("error found!")
            for err in e.errors():
                errors.append((filename, idx, err['type'], err['loc'], err['msg'], err['url']))

    for i in errors:
        print(i)