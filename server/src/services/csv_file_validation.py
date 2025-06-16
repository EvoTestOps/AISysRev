import csv
from pydantic import ValidationError
from schemas.publication import PublicationRowData

def validate_csv(file_obj, filename: str):
    reader = csv.DictReader(
        file_obj.read().decode("utf-8").splitlines(),
        fieldnames=["title", "abstract", "doi"]
    )
    errors = []

    for idx, row in enumerate(reader):
        try:
            PublicationRowData(**row)
        except ValidationError as e:
            for err in e.errors():
                errors.append({
                    "file": filename,
                    "row": idx,
                    "message": err["msg"]
                })

    return errors
