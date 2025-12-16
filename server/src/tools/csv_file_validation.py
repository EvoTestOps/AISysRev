import io
from typing import BinaryIO, List
import pandas as pd
from pydantic import ValidationError
from src.schemas.publication import PublicationRowData
from src.schemas.file_service import FileError

REQUIRED_FIELDS = {"title", "abstract", "doi"}


def validate_csv(file_obj: BinaryIO, filename: str) -> List[FileError]:
    errors: List[FileError] = []
    try:
        raw = file_obj.read()
        df = pd.read_csv(io.BytesIO(raw), encoding="utf-8-sig")
        df.columns = [str(c).strip().lower() for c in df.columns]
        missing = REQUIRED_FIELDS - set(df.columns)
        if missing:
            return [
                FileError(
                    **{
                        "file": filename or "NO_FILENAME",
                        "row": "header",
                        "message": f"Missing required columns: {', '.join(missing)}",
                    }
                )
            ]
        df["doi"] = df["doi"].astype(str)
        for idx, row in df.iterrows():
            if pd.isna(row.get("doi")):
                row["doi"] = None
            try:
                PublicationRowData(**row.to_dict())
            except ValidationError as e:
                for err in e.errors():
                    errors.append(
                        FileError(file=filename, row=int(idx), message=err["msg"])
                    )  # type: ignore
    except pd.errors.ParserError as e:
        errors.append(
            FileError(
                **{
                    "file": filename,
                    "row": "unknown",
                    "message": f"CSV parsing error: {e}",
                }
            )
        )
    finally:
        try:
            file_obj.seek(0)
        except Exception:
            pass
    return errors
