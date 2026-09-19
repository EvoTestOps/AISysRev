"""More validate_csv cases; the basic required-column cases are in test_010_unit.py."""

import io
from unittest.mock import patch

import pytest

from src.schemas.project import ScreeningTarget
from src.tools.csv_file_validation import validate_csv

pytestmark = pytest.mark.unit


def _file(text: str) -> io.BytesIO:
    return io.BytesIO(text.encode("utf-8"))


GITHUB_CSV = (
    "repository_name,description,html_url,readme\n"
    "octo/tool,A useful tool,https://github.com/octo/tool,# Readme text\n"
    "octo/other,Another,https://github.com/octo/other,More readme\n"
)


# --- paper CSVs -------------------------------------------------------------


def test_column_names_are_normalised_to_stripped_lowercase():
    file = _file(" Title ,ABSTRACT,Doi\nA title,An abstract,10.1/x\n")

    df, errors, _ = validate_csv(file, "papers.csv")

    assert errors == []
    assert df is not None
    assert list(df.columns) == ["title", "abstract", "doi"]


def test_extra_columns_are_kept():
    file = _file("title,abstract,doi,keywords\nA,B,10.1/x,k1\n")

    df, errors, _ = validate_csv(file, "papers.csv")

    assert errors == []
    assert df is not None
    assert "keywords" in df.columns


def test_empty_abstracts_are_counted():
    file = _file("title,abstract,doi\nA,B,10.1/a\nC,,10.1/c\nD,,10.1/d\n")

    df, errors, empty_abstracts = validate_csv(file, "papers.csv")

    assert errors == []
    assert df is not None and len(df) == 3
    assert empty_abstracts == 2


def test_missing_values_become_none():
    file = _file("title,abstract,doi\nA,,\n")

    df, _, _ = validate_csv(file, "papers.csv")

    assert df is not None
    assert df.loc[0, "abstract"] is None
    assert df.loc[0, "doi"] is None


def test_blank_title_is_reported_with_its_row_number():
    file = _file("title,abstract,doi\nOK,B,10.1/a\n ,B,10.1/b\n")

    _, errors, _ = validate_csv(file, "papers.csv")

    assert len(errors) == 1
    assert errors[0].file == "papers.csv"
    assert errors[0].row == "2"
    assert errors[0].message.startswith("title: ")
    assert "non-empty" in errors[0].message


def test_missing_title_value_is_reported_for_each_bad_row():
    file = _file("title,abstract,doi\n,B,10.1/a\nOK,B,10.1/b\n,B,10.1/c\n")

    _, errors, _ = validate_csv(file, "papers.csv")

    assert [e.row for e in errors] == ["1", "3"]


def test_missing_columns_error_uses_a_placeholder_when_there_is_no_filename():
    df, errors, count = validate_csv(_file("title,abstract\nA,B\n"), "")

    assert df is None
    assert count == 0
    assert errors[0].file == "NO_FILENAME"
    assert errors[0].row == "header"


def test_ragged_csv_is_reported_as_a_parsing_error():
    file = _file("title,abstract,doi\nA,B,C\nD,E,F,G,H,I\n")

    df, errors, count = validate_csv(file, "papers.csv")

    assert df is None
    assert count == 0
    assert len(errors) == 1
    assert errors[0].row == "unknown"
    assert errors[0].message.startswith("CSV parsing error")


def test_empty_file_is_reported_as_a_decoding_error():
    df, errors, count = validate_csv(_file(""), "empty.csv")

    assert df is None
    assert count == 0
    assert errors[0].message.startswith("CSV decoding error")


def test_undetectable_encoding_is_reported_as_a_decoding_error():
    with patch(
        "src.tools.csv_file_validation.read_csv_resilient",
        side_effect=ValueError("Could not determine file encoding"),
    ):
        df, errors, count = validate_csv(_file("x"), "weird.csv")

    assert df is None
    assert count == 0
    assert [(e.file, e.row) for e in errors] == [("weird.csv", "unknown")]
    assert errors[0].message == "CSV decoding error: Could not determine file encoding"


def test_file_position_is_rewound_after_validation():
    file = _file("title,abstract,doi\nA,B,10.1/x\n")

    validate_csv(file, "papers.csv")

    assert file.tell() == 0


def test_file_position_is_rewound_even_when_validation_fails():
    file = _file("title,abstract\nA,B\n")

    validate_csv(file, "papers.csv")

    assert file.tell() == 0


def test_validation_still_works_when_the_file_cannot_be_rewound():
    class NotSeekable(io.BytesIO):
        def seek(self, *args, **kwargs):
            raise ValueError("I/O operation on closed file")

    file = NotSeekable(b"title,abstract,doi\nA,B,10.1/x\n")

    df, errors, _ = validate_csv(file, "papers.csv")

    assert errors == []
    assert df is not None


# --- GitHub CSVs ------------------------------------------------------------


def test_github_csv_is_mapped_to_title_abstract_and_doi():
    df, errors, empty_abstracts = validate_csv(
        _file(GITHUB_CSV), "repos.csv", ScreeningTarget.GITHUB_REPOSITORY
    )

    assert errors == []
    assert empty_abstracts == 0
    assert df is not None
    assert list(df["title"]) == ["octo/tool - A useful tool", "octo/other - Another"]
    assert list(df["abstract"]) == ["# Readme text", "More readme"]
    assert list(df["doi"]) == [
        "https://github.com/octo/tool",
        "https://github.com/octo/other",
    ]


def test_github_csv_does_not_need_the_paper_columns():
    df, errors, _ = validate_csv(
        _file(GITHUB_CSV), "repos.csv", ScreeningTarget.GITHUB_REPOSITORY
    )

    assert errors == []
    assert df is not None


def test_paper_csv_is_rejected_when_validated_as_github():
    df, errors, _ = validate_csv(
        _file("title,abstract,doi\nA,B,C\n"),
        "papers.csv",
        ScreeningTarget.GITHUB_REPOSITORY,
    )

    assert df is None
    assert errors[0].row == "header"
    assert errors[0].message.startswith("Missing required columns: ")
    for column in ("repository_name", "description", "html_url", "readme"):
        assert column in errors[0].message


def test_github_csv_is_rejected_when_validated_as_paper():
    df, errors, _ = validate_csv(_file(GITHUB_CSV), "repos.csv")

    assert df is None
    assert errors[0].message.startswith("Missing required columns: ")


def test_github_csv_with_empty_readme_counts_as_empty_abstract():
    csv = (
        "repository_name,description,html_url,readme\n"
        "octo/tool,Tool,https://github.com/octo/tool,\n"
    )

    _, errors, empty_abstracts = validate_csv(
        _file(csv), "repos.csv", ScreeningTarget.GITHUB_REPOSITORY
    )

    assert errors == []
    assert empty_abstracts == 1


def test_github_csv_reports_a_blank_repository_name_with_the_github_column_name():
    csv = (
        "repository_name,description,html_url,readme\n"
        "octo/tool,Tool,https://github.com/octo/tool,text\n"
        ",No name,https://github.com/octo/x,text\n"
    )

    _, errors, _ = validate_csv(
        _file(csv), "repos.csv", ScreeningTarget.GITHUB_REPOSITORY
    )

    assert [(e.row, e.message) for e in errors] == [
        ("2", "repository_name: Field must be non-empty")
    ]
