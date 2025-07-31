import io
import pytest
from src.tools.csv_file_validation import validate_csv

@pytest.mark.unit
def test_validate_csv_success():
    csv_content = "title,abstract,doi\nTest Title,Test Abstract,10.1234/test"
    file_obj = io.BytesIO(csv_content.encode("utf-8"))
    errors = validate_csv(file_obj, "test.csv")
    assert errors == []

@pytest.mark.unit
def test_validate_csv_missing_title_field():
    csv_content = "abstract,doi\nTest Abstract,10.1234/test"
    file_obj = io.BytesIO(csv_content.encode("utf-8"))
    errors = validate_csv(file_obj, "test.csv")
    assert errors == [{'file': 'test.csv', 'row': 'header', 'message': 'Missing required columns: title'}]

@pytest.mark.unit
def test_validate_csv_missing_abstract_field():
    csv_content = "title,doi\nTest Title,10.1234/test"
    file_obj = io.BytesIO(csv_content.encode("utf-8"))
    errors = validate_csv(file_obj, "test.csv")
    assert errors == [{'file': 'test.csv', 'row': 'header', 'message': 'Missing required columns: abstract'}]

@pytest.mark.unit
def test_validate_csv_missing_doi_field():
    csv_content = "title,abstract\nTest Title,Test Abstract"
    file_obj = io.BytesIO(csv_content.encode("utf-8"))
    errors = validate_csv(file_obj, "test.csv")
    assert errors == [{'file': 'test.csv', 'row': 'header', 'message': 'Missing required columns: doi'}]
