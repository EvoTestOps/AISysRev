from io import BytesIO
from typing import BinaryIO

import numpy as np
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader


def to_valid_unicode(text: str) -> str:
    """Make extracted text safe to encode as UTF-8 (JSON requests, Postgres).

    pypdf can return UTF-16 surrogates: a pair (e.g. a math-italic letter)
    is joined back into its real character, and a lone surrogate becomes
    U+FFFD. Unhandled, either makes the embedding request fail with
    "surrogates not allowed".
    """
    return text.encode("utf-16", "surrogatepass").decode("utf-16", "replace")


def extract_pdf_text(pdf: bytes | BinaryIO) -> str:
    """Extract the text of a PDF given as bytes or as a seekable binary stream.

    Prefer a stream (see pdf_storage.open_pdf_stream): pypdf then reads only the
    objects it needs, so embedded images are never loaded into memory.
    """
    reader = PdfReader(BytesIO(pdf) if isinstance(pdf, bytes) else pdf)
    text = "\n".join(page.extract_text() for page in reader.pages)
    return to_valid_unicode(text.replace("\x00", ""))


def chunk_text(text: str, chunk_size: int = 500, chunk_overlap: int = 100) -> list[str]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )
    return splitter.split_text(text)


def top_k_chunks_by_similarity(
    chunk_texts: list[str],
    chunk_embeddings: list[list[float]],
    criteria_embedding: list[float],
    k: int = 3,
) -> list[str]:
    if not chunk_embeddings:
        return []
    embeddings_matrix = np.array(chunk_embeddings)
    criteria_vector = np.array(criteria_embedding)
    chunk_norms = np.linalg.norm(embeddings_matrix, axis=1)
    criteria_norm = np.linalg.norm(criteria_vector)
    similarities = (embeddings_matrix @ criteria_vector) / (chunk_norms * criteria_norm)
    top_k_indices = np.argsort(similarities)[::-1][:k]
    return [chunk_texts[i] for i in top_k_indices]


def merge_and_dedupe_chunks(chunk_lists: list[list[str]]) -> list[str]:
    seen = set()
    merged = []
    for chunks in chunk_lists:
        for chunk in chunks:
            if chunk not in seen:
                seen.add(chunk)
                merged.append(chunk)
    return merged
