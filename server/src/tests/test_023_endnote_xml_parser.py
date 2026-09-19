import pytest

from src.tools.endnote_xml_parser import parse_endnote_xml, path_suffix

pytestmark = pytest.mark.unit


def _xml(*records: str) -> bytes:
    return f"<xml><records>{''.join(records)}</records></xml>".encode()


def _record(doi: str | None = None, pdf_url: str | None = None) -> str:
    parts = []
    if doi is not None:
        parts.append(f"<electronic-resource-num>{doi}</electronic-resource-num>")
    if pdf_url is not None:
        parts.append(f"<urls><pdf-urls><url>{pdf_url}</url></pdf-urls></urls>")
    return f"<record>{''.join(parts)}</record>"


def test_parses_doi_and_pdf_path_of_a_record():
    records = parse_endnote_xml(
        _xml(_record("10.1/abc", "internal-pdf://files/123/paper.pdf"))
    )

    assert len(records) == 1
    assert records[0].doi == "10.1/abc"
    assert records[0].pdf_relative_path == "files/123/paper.pdf"


def test_parses_multiple_records_in_order():
    records = parse_endnote_xml(
        _xml(
            _record("10.1/a", "internal-pdf://a.pdf"),
            _record("10.1/b", "internal-pdf://b.pdf"),
        )
    )

    assert [r.doi for r in records] == ["10.1/a", "10.1/b"]
    assert [r.pdf_relative_path for r in records] == ["a.pdf", "b.pdf"]


def test_surrounding_whitespace_is_stripped():
    records = parse_endnote_xml(
        _xml(_record("  10.1/abc \n", "  internal-pdf://x/y.pdf  "))
    )

    assert records[0].doi == "10.1/abc"
    assert records[0].pdf_relative_path == "x/y.pdf"


def test_record_without_doi_keeps_the_pdf_path():
    records = parse_endnote_xml(_xml(_record(pdf_url="internal-pdf://only.pdf")))

    assert records[0].doi is None
    assert records[0].pdf_relative_path == "only.pdf"


def test_record_without_pdf_keeps_the_doi():
    records = parse_endnote_xml(_xml(_record(doi="10.1/abc")))

    assert records[0].doi == "10.1/abc"
    assert records[0].pdf_relative_path is None


def test_record_without_any_fields_is_still_returned():
    records = parse_endnote_xml(_xml("<record></record>"))

    assert len(records) == 1
    assert records[0].doi is None
    assert records[0].pdf_relative_path is None


def test_pdf_url_without_the_internal_prefix_is_kept_as_is():
    records = parse_endnote_xml(_xml(_record(pdf_url="files/paper.pdf")))

    assert records[0].pdf_relative_path == "files/paper.pdf"


def test_empty_doi_element_counts_as_missing():
    records = parse_endnote_xml(_xml(_record(doi="")))

    assert records[0].doi is None


def test_records_are_found_at_any_depth():
    xml = b"<xml><a><b><record><electronic-resource-num>10.1/deep</electronic-resource-num></record></b></a></xml>"

    assert [r.doi for r in parse_endnote_xml(xml)] == ["10.1/deep"]


def test_document_without_records_gives_an_empty_list():
    assert parse_endnote_xml(b"<xml><records></records></xml>") == []


@pytest.mark.parametrize("bad", [b"", b"not xml at all", b"<xml><records></xml>"])
def test_invalid_xml_raises_a_value_error(bad: bytes):
    with pytest.raises(ValueError, match="Invalid EndNote XML file"):
        parse_endnote_xml(bad)


@pytest.mark.parametrize(
    "path, expected",
    [
        ("paper.pdf", "paper.pdf"),
        ("files/paper.pdf", "files/paper.pdf"),
        ("files/123/paper.pdf", "123/paper.pdf"),
        ("a/b/c/d/paper.pdf", "d/paper.pdf"),
        ("files\\123\\paper.pdf", "123/paper.pdf"),
        ("C:\\Users\\me\\lib\\paper.pdf", "lib/paper.pdf"),
    ],
)
def test_path_suffix_keeps_the_last_two_segments(path: str, expected: str):
    assert path_suffix(path) == expected
