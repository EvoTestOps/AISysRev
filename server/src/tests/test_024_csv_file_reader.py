from unittest.mock import MagicMock, patch

import pandas as pd
import pytest
from charset_normalizer import from_bytes

from src.tools.csv_file_reader import read_csv_resilient

pytestmark = pytest.mark.unit

CSV = "title,abstract,doi\nCafé au lait,A study of coffee,10.1/x\n"


def test_reads_utf8_csv_without_encoding_detection():
    with patch("src.tools.csv_file_reader.from_bytes") as detect:
        df = read_csv_resilient(CSV.encode("utf-8"))

    detect.assert_not_called()
    assert list(df.columns) == ["title", "abstract", "doi"]
    assert df.loc[0, "title"] == "Café au lait"


def test_strips_the_utf8_byte_order_mark_from_the_first_column():
    df = read_csv_resilient(CSV.encode("utf-8-sig"))

    assert list(df.columns) == ["title", "abstract", "doi"]


def test_falls_back_to_detected_encoding_when_not_utf8():
    raw = CSV.encode("cp1252")
    with pytest.raises(UnicodeDecodeError):
        raw.decode("utf-8")

    with patch("src.tools.csv_file_reader.from_bytes", wraps=from_bytes) as detect:
        df = read_csv_resilient(raw)

    detect.assert_called_once_with(raw)
    assert list(df.columns) == ["title", "abstract", "doi"]
    assert len(df) == 1
    assert df.loc[0, "doi"] == "10.1/x"


def test_raises_when_no_encoding_can_be_determined():
    raw = "é".encode("cp1252")
    no_match = MagicMock()
    no_match.best.return_value = None

    with patch("src.tools.csv_file_reader.from_bytes", return_value=no_match):
        with pytest.raises(ValueError, match="Could not determine file encoding"):
            read_csv_resilient(raw)


def test_empty_input_raises_pandas_empty_data_error():
    with pytest.raises(pd.errors.EmptyDataError):
        read_csv_resilient(b"")


def test_header_only_csv_gives_an_empty_frame():
    df = read_csv_resilient(b"title,abstract,doi\n")

    assert list(df.columns) == ["title", "abstract", "doi"]
    assert len(df) == 0
