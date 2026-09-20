"""More PDF extraction cases; the basic ones are in test_008_pdf_unit.py."""

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from pypdf.errors import PdfReadError

from src.tools.pdf_chunk_extraction import (
    chunk_text,
    extract_pdf_text,
    merge_and_dedupe_chunks,
    top_k_chunks_by_similarity,
)
from src.tools.pdf_file_validation import validate_pdf

pytestmark = pytest.mark.unit

FIXTURE_PDF = Path(__file__).parent / "fixtures" / "test.pdf"


# --- extract_pdf_text -------------------------------------------------------


def test_extracts_the_text_of_a_real_pdf():
    text = extract_pdf_text(FIXTURE_PDF.read_bytes())

    assert "Time Pressure" in text
    assert len(text) > 1000


def test_extracted_text_has_no_nul_characters():
    page = MagicMock()
    page.extract_text.return_value = "before\x00after"

    with patch("src.tools.pdf_chunk_extraction.PdfReader") as reader:
        reader.return_value.pages = [page]
        text = extract_pdf_text(b"ignored")

    assert text == "beforeafter"


def test_pages_are_joined_with_newlines():
    pages = [MagicMock(), MagicMock()]
    pages[0].extract_text.return_value = "first"
    pages[1].extract_text.return_value = "second"

    with patch("src.tools.pdf_chunk_extraction.PdfReader") as reader:
        reader.return_value.pages = pages
        text = extract_pdf_text(b"ignored")

    assert text == "first\nsecond"


def test_bytes_that_are_not_a_pdf_raise_a_pdf_error():
    with pytest.raises(PdfReadError):
        extract_pdf_text(b"this is definitely not a pdf")


# --- chunk_text -------------------------------------------------------------


def test_empty_text_gives_no_chunks():
    assert chunk_text("") == []


def test_chunks_respect_the_chunk_size():
    text = " ".join(f"word{i}" for i in range(500))

    chunks = chunk_text(text, chunk_size=200, chunk_overlap=20)

    assert len(chunks) > 1
    assert all(len(c) <= 200 for c in chunks)


def test_consecutive_chunks_overlap():
    words = [f"w{i:03d}" for i in range(300)]

    chunks = chunk_text(" ".join(words), chunk_size=200, chunk_overlap=50)

    assert len(chunks) > 2
    for previous, current in zip(chunks, chunks[1:]):
        assert set(previous.split()) & set(current.split())


def test_no_words_are_lost_when_chunking():
    words = [f"w{i:03d}" for i in range(300)]

    chunks = chunk_text(" ".join(words), chunk_size=200, chunk_overlap=50)

    assert {w for c in chunks for w in c.split()} == set(words)


def test_chunking_a_whole_pdf_gives_several_chunks_within_the_size_limit():
    text = extract_pdf_text(FIXTURE_PDF.read_bytes())

    chunks = chunk_text(text, chunk_size=500, chunk_overlap=100)

    assert len(chunks) > 10
    assert all(len(c) <= 500 for c in chunks)


# --- top_k_chunks_by_similarity ---------------------------------------------

CHUNKS = ["along x", "diagonal", "along y"]
EMBEDDINGS = [[1.0, 0.0], [1.0, 1.0], [0.0, 1.0]]


def test_chunks_are_returned_most_similar_first():
    result = top_k_chunks_by_similarity(CHUNKS, EMBEDDINGS, [1.0, 0.2], k=3)

    assert result == ["along x", "diagonal", "along y"]


def test_k_limits_the_number_of_chunks():
    result = top_k_chunks_by_similarity(CHUNKS, EMBEDDINGS, [0.0, 1.0], k=2)

    assert result == ["along y", "diagonal"]


def test_k_larger_than_the_number_of_chunks_returns_all_of_them():
    result = top_k_chunks_by_similarity(CHUNKS, EMBEDDINGS, [1.0, 0.0], k=10)

    assert sorted(result) == sorted(CHUNKS)


def test_k_of_zero_returns_nothing():
    assert top_k_chunks_by_similarity(CHUNKS, EMBEDDINGS, [1.0, 0.0], k=0) == []


def test_similarity_ignores_the_length_of_the_vectors():
    scaled = [[100.0, 0.0], [3.0, 3.0], [0.0, 0.01]]

    result = top_k_chunks_by_similarity(CHUNKS, scaled, [0.0, 50.0], k=1)

    assert result == ["along y"]


def test_default_k_is_three():
    chunks = [f"c{i}" for i in range(5)]
    embeddings = [[1.0, float(i)] for i in range(5)]

    assert len(top_k_chunks_by_similarity(chunks, embeddings, [1.0, 0.0])) == 3


# --- merge_and_dedupe_chunks ------------------------------------------------


def test_merging_nothing_gives_nothing():
    assert merge_and_dedupe_chunks([]) == []
    assert merge_and_dedupe_chunks([[], []]) == []


def test_merging_keeps_the_first_seen_order():
    assert merge_and_dedupe_chunks([["c", "a"], ["b", "a"], ["d", "c"]]) == [
        "c",
        "a",
        "b",
        "d",
    ]


def test_duplicates_inside_one_list_are_removed():
    assert merge_and_dedupe_chunks([["a", "a", "b"]]) == ["a", "b"]


# --- validate_pdf (the rejection cases; the accepting case is in test_008) ---


def test_a_file_that_is_not_a_pdf_is_rejected():
    errors = validate_pdf(b"<html>not a pdf</html>", "page.pdf", max_size_bytes=1000)

    assert [(e.file, e.row, e.message) for e in errors] == [
        ("page.pdf", "file", "File is not a valid PDF")
    ]


def test_a_file_that_is_both_not_a_pdf_and_too_large_gets_both_errors():
    errors = validate_pdf(b"x" * 2 * 1024 * 1024, "big.txt", max_size_bytes=1024 * 1024)

    assert [e.message for e in errors] == [
        "File is not a valid PDF",
        "PDF exceeds maximum allowed size of 1 MB",
    ]


def test_a_pdf_exactly_at_the_size_limit_is_accepted():
    content = b"%PDF-" + b"a" * 95

    assert validate_pdf(content, "ok.pdf", max_size_bytes=len(content)) == []
