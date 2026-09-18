from unittest.mock import MagicMock

import pytest
from httpx2 import AsyncClient

from src.core.llm.providers.mock import MockProvider
from src.crud.pdf_chunk_embedding_crud import PdfChunkEmbeddingCrud
from src.crud.project_crud import ProjectCrud
from src.db.db_context import DBContext
from src.schemas.llm import ProviderRuntimeParameters
from src.schemas.pdf_chunk_embedding import PdfChunkEmbeddingCreate
from src.services.pdf_screening_service import create_pdf_screening_service
from src.tools.pdf_chunk_extraction import chunk_text, extract_pdf_text


@pytest.mark.asyncio
async def test_get_criteria_embeddings_without_cache_and_does_not_cache_for_mock(
    db_ctx: DBContext, test_project_uuid, test_user_uuid
):
    service = create_pdf_screening_service(db_ctx)
    inclusion, exclusion = await service.get_criteria_embeddings(
        MockProvider,
        {"delay": 0, "delay_jitter": 0},
        ProviderRuntimeParameters(),
        MagicMock(spec=AsyncClient),
        test_project_uuid,
        test_user_uuid,
        ["A", "B", "C"],
        ["D", "E", "F"],
    )

    assert len(inclusion) == 3
    assert len(exclusion) == 3
    assert len(inclusion[0]) == 1536

    project_crud = db_ctx.crud(ProjectCrud)
    project = await project_crud.fetch_project_by_uuid(
        test_project_uuid, test_user_uuid
    )
    assert project is not None
    assert project.inclusion_criteria_embedding is None


@pytest.mark.asyncio
async def test_get_criteria_embeddings_uses_cached_embeddings(
    db_ctx: DBContext, test_project_uuid, test_user_uuid
):
    project_crud = db_ctx.crud(ProjectCrud)
    cached_inclusion = [[0.1] * 8]
    cached_exclusion = [[0.2] * 8]
    await project_crud.set_criteria_embeddings(
        test_project_uuid, test_user_uuid, cached_inclusion, cached_exclusion
    )

    service = create_pdf_screening_service(db_ctx)
    inclusion, exclusion = await service.get_criteria_embeddings(
        MockProvider,
        {"delay": 0, "delay_jitter": 0},
        ProviderRuntimeParameters(),
        MagicMock(spec=AsyncClient),
        test_project_uuid,
        test_user_uuid,
        ["A"],
        ["D"],
    )

    assert inclusion == cached_inclusion
    assert exclusion == cached_exclusion


@pytest.mark.asyncio
async def test_get_chunks_with_embeddings_without_cache_and_does_not_cache_for_mock(
    db_ctx: DBContext, test_pdf_file_uuid, test_user_uuid
):
    service = create_pdf_screening_service(db_ctx)
    chunks, embeddings = await service.get_chunks_with_embeddings(
        MockProvider,
        {"delay": 0, "delay_jitter": 0},
        ProviderRuntimeParameters(),
        MagicMock(spec=AsyncClient),
        test_pdf_file_uuid,
        test_user_uuid,
    )

    assert len(chunks) > 0
    assert all(len(e) == 1536 for e in embeddings)

    pdf_chunk_embedding_crud = db_ctx.crud(PdfChunkEmbeddingCrud)
    cached = await pdf_chunk_embedding_crud.fetch_chunks_by_pdf_file_uuid(
        test_pdf_file_uuid, test_user_uuid
    )
    assert cached == []


@pytest.mark.asyncio
async def test_get_chunks_with_embeddings_uses_cached_chunks(
    db_ctx: DBContext, test_pdf_file_uuid, test_user_uuid
):
    pdf_chunk_embedding_crud = db_ctx.crud(PdfChunkEmbeddingCrud)
    await pdf_chunk_embedding_crud.bulk_create_chunks(
        [
            PdfChunkEmbeddingCreate(
                pdf_file_uuid=test_pdf_file_uuid,
                chunk_index=0,
                chunk_text="cached chunk text",
                embedding=[0.1] * 8,
            )
        ],
        test_user_uuid,
    )

    service = create_pdf_screening_service(db_ctx)
    chunks, embeddings = await service.get_chunks_with_embeddings(
        MockProvider,
        {"delay": 0, "delay_jitter": 0},
        ProviderRuntimeParameters(),
        MagicMock(spec=AsyncClient),
        test_pdf_file_uuid,
        test_user_uuid,
    )

    assert chunks == ["cached chunk text"]
    assert embeddings == [[0.1] * 8]


@pytest.mark.asyncio
async def test_get_pdf_chunks_for_screening_returns_expected_chunks(
    db_ctx: DBContext, test_project_uuid, test_pdf_file_uuid, test_user_uuid
):
    service = create_pdf_screening_service(db_ctx)
    result = await service.get_pdf_chunks_for_screening(
        MockProvider,
        {"delay": 0, "delay_jitter": 0},
        ProviderRuntimeParameters(),
        MagicMock(spec=AsyncClient),
        test_project_uuid,
        test_user_uuid,
        test_pdf_file_uuid,
        ["A", "B", "C"],
        ["D", "E", "F"],
    )

    # Criteria/chunk embeddings from MockProvider are random, so the exact
    # chunk(s) picked by similarity aren't deterministic. Assert instead that
    # every returned chunk is a genuine, distinct chunk of the source PDF.
    valid_chunks = set(chunk_text(extract_pdf_text(test_pdf_bytes)))
    returned_chunks = result.split("\n\n")
    assert 1 <= len(returned_chunks) <= 6
    assert len(returned_chunks) == len(set(returned_chunks))
    assert all(chunk in valid_chunks for chunk in returned_chunks)
