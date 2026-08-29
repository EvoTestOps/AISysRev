from io import BytesIO

import numpy as np
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader


def extract_pdf_text(pdf_bytes: bytes) -> str:
    reader = PdfReader(BytesIO(pdf_bytes))
    text = "\n".join(page.extract_text() for page in reader.pages)
    return text.replace("\x00", "")


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
