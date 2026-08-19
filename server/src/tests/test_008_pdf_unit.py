import pytest

from src.schemas.file_service import FileError
from src.tools.pdf_chunk_extraction import (
    chunk_text,
    extract_pdf_text,
    merge_and_dedupe_chunks,
    top_k_chunks_by_similarity,
)
from src.tools.pdf_file_validation import validate_pdf


@pytest.mark.unit
def test_chunk_text_returns_one_chunk_when_text_is_shorter_than_chunk_size():
    text = " ".join(f"word{i}" for i in range(50))
    chunks = chunk_text(text, chunk_size=500, chunk_overlap=100)
    assert chunks == [text]


@pytest.mark.unit
def test_chunk_text_returns_multiple_chunks_when_text_is_longer_than_chunk_size():
    text = " ".join(f"word{i}" for i in range(200))
    chunks = chunk_text(text, chunk_size=500, chunk_overlap=100)
    assert len(chunks) > 1


@pytest.mark.unit
def test_top_k_chunks_by_similarity_returns_most_similar_chunk():
    chunk_texts = ["a", "b", "c"]
    chunk_embeddings = [[0.5, 0.5], [1.0, 0.0], [0.0, 1.0]]
    criteria_embedding = [1.0, 0.0]
    assert top_k_chunks_by_similarity(chunk_texts, chunk_embeddings, criteria_embedding, k=1) == ["b"]


@pytest.mark.unit
def test_top_k_chunks_by_similarity_returns_empty_list_when_no_embeddings():
    assert top_k_chunks_by_similarity([], [], [1.0, 0.0], k=1) == []


@pytest.mark.unit
def test_merge_and_dedupe_chunks_removes_duplicates():
    chunks = [["a", "b"], ["b", "c"], ["a"]]
    assert merge_and_dedupe_chunks(chunks) == ["a", "b", "c"]


@pytest.mark.unit
def test_validate_pdf_accepts_valid_pdf_within_size_limit():
    max_size_bytes = 1 * 1024 * 1024
    content = b"%PDF- pdf content"
    errors = validate_pdf(content, "test_paper.pdf", max_size_bytes=max_size_bytes)
    assert errors == []


@pytest.mark.unit
def test_validate_pdf_flags_valid_pdf_over_size_limit():
    max_size_bytes = 1 * 1024 * 1024
    content = b"%PDF-" + b"a" * max_size_bytes
    errors = validate_pdf(content, "test_paper.pdf", max_size_bytes=max_size_bytes)
    assert errors == [
        FileError(
            file="test_paper.pdf",
            row="file",
            message="PDF exceeds maximum allowed size of 1 MB",
        )
    ]


@pytest.mark.unit
def test_extract_pdf_text_returns_expected_text(test_pdf_bytes):
    text = extract_pdf_text(test_pdf_bytes)
    assert "Time Pressure: A Controlled Experiment of Test Case" in text
    assert "Table 2 shows examples of time pressure studies in other fields" in text

