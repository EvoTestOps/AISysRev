from typing import BinaryIO, List, Optional, Literal

import pandas as pd
from pydantic import TypeAdapter, ValidationError

from src.schemas.file_service import FileError
from src.tools.csv_file_reader import read_csv_resilient
from src.schemas.publication import PublicationRowData

REQUIRED_FIELDS = {"title", "abstract", "doi"}
GITHUB_REQUIRED_FIELDS = {"repository_name", "description", "html_url", "readme"}


def validate_csv(
    file_obj: BinaryIO, filename: str, screening_target: Literal["PAPER", "GITHUB_REPOSITORY"] = "PAPER",
) -> tuple[Optional[pd.DataFrame], List[FileError], int]:
    errors: List[FileError] = []
    empty_abstract_count = 0
    df = None

    try:
        raw = file_obj.read()
        df = read_csv_resilient(raw)
        df.columns = [str(c).strip().lower() for c in df.columns]
        if screening_target == "GITHUB_REPOSITORY":
            missing = GITHUB_REQUIRED_FIELDS - set(df.columns)
        else:
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
        if screening_target == "GITHUB_REPOSITORY":
            df["title"] = (
                df["repository_name"].fillna("").astype(str).str.strip()
                + " - "
                + df["description"].fillna("").astype(str).str.strip()
            )
            df["abstract"] = df["readme"]
            df["doi"] = df["html_url"]

        df = df.astype(object).where(df.notna(), None)
        empty_abstract_count = df["abstract"].isna().sum()

        records = df.to_dict("records")
        adapter = TypeAdapter(list[PublicationRowData])

        try:
            adapter.validate_python(records)
        except ValidationError as e:
            github_field_names = {
                    "title": "repository_name",
                    "abstract": "readme",
                    "doi": "html_url",
                }
            for err in e.errors():
                row = int(err["loc"][0]) + 1
                err_field = err["loc"][1]
                if screening_target == "GITHUB_REPOSITORY":
                    err_field = github_field_names.get(err_field, err_field)
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
    except ValueError as e:
        errors.append(
            FileError(
                **{
                    "file": filename,
                    "row": "unknown",
                    "message": f"CSV decoding error: {e}",
                }
            )
        )

    finally:
        try:
            file_obj.seek(0)
        except Exception:
            pass

    return df, errors, empty_abstract_count
