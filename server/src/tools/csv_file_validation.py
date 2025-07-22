import csv
from pydantic import ValidationError
from src.schemas.publication import PublicationRowData

REQUIRED_FIELDS = {"title", "abstract", "doi"}

def validate_csv(file_obj, filename: str):
    reader = csv.DictReader(file_obj.read().decode("utf-8-sig").splitlines())
    errors = []

    fieldnames = {name.strip().lower() for name in (reader.fieldnames or [])}
    missing = REQUIRED_FIELDS - fieldnames
    if missing:
        return [{
            "file": filename,
            "row": "header",
            "message": f"Missing required columns: {', '.join(missing)}"
        }]

    for idx, row in enumerate(reader, start=2):
        row_lower = {key.strip().lower(): value for key, value in row.items()}
        try:
            PublicationRowData(**row_lower)
        except ValidationError as e:
            for err in e.errors():
                errors.append({
                    "file": filename,
                    "row": idx,
                    "message": err["msg"]
                })

    return errors
