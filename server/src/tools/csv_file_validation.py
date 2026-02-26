import io
from typing import BinaryIO, List, Optional

import pandas as pd
from pydantic import TypeAdapter, ValidationError

from src.schemas.file_service import FileError
from src.schemas.publication import PublicationRowData

REQUIRED_FIELDS = {"title", "abstract", "doi"}


def validate_csv(
    file_obj: BinaryIO, filename: str
) -> tuple[Optional[pd.DataFrame], List[FileError], int]:
    errors: List[FileError] = []
    empty_abstract_count = 0

    try:
        raw = file_obj.read()
        df = pd.read_csv(io.BytesIO(raw), encoding="utf-8-sig")
        df.columns = [str(c).strip().lower() for c in df.columns]

        missing = REQUIRED_FIELDS - set(df.columns)
        if missing:
            return (
                None,
                [
                    FileError(
                        **{
                            "file": filename or "NO_FILENAME",
                            "row": "header",
                            "message": f"Missing required columns: {', '.join(missing)}",
                        }
                    )
                ],
                0,
            )

        df = df.where(df.notna(), None)
        empty_abstract_count = df["abstract"].isna().sum()

        records = df.to_dict("records")
        adapter = TypeAdapter(list[PublicationRowData])

        try:
            adapter.validate_python(records)
        except ValidationError as e:
            for err in e.errors():
                row = int(err["loc"][0]) + 1
                err_field = err["loc"][1]
                errors.append(
                    FileError(
                        file=filename,
                        row=str(row),
                        message=f"{err_field}: {err['msg']}",
                    )
                )
    except pd.errors.ParserError as e:
        return (
            None,
            [
                FileError(
                    file=filename,
                    row="unknown",
                    message=f"CSV parsing error: {e}",
                )
            ],
            0,
        )
    finally:
        try:
            file_obj.seek(0)
        except Exception:
            pass

    return df, errors, empty_abstract_count
