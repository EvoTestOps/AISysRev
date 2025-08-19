import io
import pandas as pd
from pydantic import ValidationError
from src.schemas.publication import PublicationRowData

REQUIRED_FIELDS = {"title", "abstract", "doi"}


def validate_csv(file_obj: io.BytesIO, filename: str):
    errors = []
    try:
        raw = file_obj.read()
        df = pd.read_csv(io.BytesIO(raw), encoding="utf-8-sig")
        df.columns = [str(c).strip().lower() for c in df.columns]
        missing = REQUIRED_FIELDS - set(df.columns)
        if missing:
            return [
                {
                    "file": filename,
                    "row": "header",
                    "message": f"Missing required columns: {', '.join(missing)}",
                }
            ]

        for idx, row in df.iterrows():
            try:
                PublicationRowData(**row.to_dict())
            except ValidationError as e:
                for err in e.errors():
                    errors.append({"file": filename, "row": idx, "message": err["msg"]})
    except pd.errors.ParserError as e:
        errors.append(
            {"file": filename, "row": "unknown", "message": f"CSV parsing error: {e}"}
        )
    finally:
        try:
            file_obj.seek(0)
        except Exception:
            pass
    return errors
