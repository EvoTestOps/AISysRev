import pytest

from src.tools.doi_normalizer import normalize_doi

pytestmark = pytest.mark.unit


@pytest.mark.parametrize(
    "raw, expected",
    [
        (None, None),
        ("", None),
        ("   ", None),
        ("10.1234/abc", "10.1234/abc"),
        ("10.1234/ABC", "10.1234/abc"),
        ("  10.1234/abc  ", "10.1234/abc"),
        ("https://doi.org/10.1234/abc", "10.1234/abc"),
        ("http://doi.org/10.1234/abc", "10.1234/abc"),
        ("doi:10.1234/abc", "10.1234/abc"),
        ("DOI:10.1234/ABC", "10.1234/abc"),
        ("HTTPS://DOI.ORG/10.1234/ABC", "10.1234/abc"),
        ("https://doi.org/doi:10.1234/abc", "10.1234/abc"),
        # Only the prefix is left: nothing useful remains
        ("https://doi.org/", None),
        ("doi:", None),
    ],
)
def test_normalize_doi(raw: str | None, expected: str | None):
    assert normalize_doi(raw) == expected


def test_different_spellings_of_the_same_doi_normalise_equal():
    spellings = [
        "10.1145/3661167.3661172",
        "https://doi.org/10.1145/3661167.3661172",
        "doi:10.1145/3661167.3661172",
        " 10.1145/3661167.3661172 ",
    ]

    assert len({normalize_doi(s) for s in spellings}) == 1


def test_normalize_doi_is_idempotent():
    once = normalize_doi("https://doi.org/10.1234/ABC")

    assert normalize_doi(once) == once
