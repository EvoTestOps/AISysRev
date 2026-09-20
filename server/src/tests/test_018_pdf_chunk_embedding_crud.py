import pytest

from src.crud.file_crud import FileCrud
from src.crud.pdf_chunk_embedding_crud import PdfChunkEmbeddingCrud
from src.db.db_context import DBContext
from src.schemas.pdf_chunk_embedding import PdfChunkEmbeddingCreate
from src.tests.factory import Factory

pytestmark = pytest.mark.asyncio


def _chunk(pdf, index, text=None, embedding=None) -> PdfChunkEmbeddingCreate:
    return PdfChunkEmbeddingCreate(
        pdf_file_uuid=pdf.uuid,
        chunk_index=index,
        chunk_text=text or f"chunk {index}",
        embedding=embedding or [float(index), 0.5],
    )


async def _pdf(factory: Factory, owner=None):
    owner = owner or await factory.user()
    project = await factory.project(owner)
    pdf = await factory.file(project, mime_type="application/pdf")
    return owner, pdf


async def test_bulk_create_chunks_stores_and_returns_the_chunks(
    db_ctx: DBContext, factory: Factory
):
    owner, pdf = await _pdf(factory)
    crud = db_ctx.crud(PdfChunkEmbeddingCrud)

    chunks = await crud.bulk_create_chunks(
        [_chunk(pdf, 0, "first", [0.1, 0.2]), _chunk(pdf, 1, "second", [0.3, 0.4])],
        owner.uuid,
    )

    assert [c.chunk_text for c in chunks] == ["first", "second"]
    assert chunks[0].embedding == [0.1, 0.2]
    assert chunks[1].embedding == [0.3, 0.4]
    assert all(c.pdf_file_uuid == pdf.uuid for c in chunks)


async def test_bulk_create_chunks_with_no_chunks_returns_empty_list(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()

    assert (
        await db_ctx.crud(PdfChunkEmbeddingCrud).bulk_create_chunks([], owner.uuid)
        == []
    )


async def test_bulk_create_chunks_returns_chunks_ordered_by_index(
    db_ctx: DBContext, factory: Factory
):
    owner, pdf = await _pdf(factory)
    crud = db_ctx.crud(PdfChunkEmbeddingCrud)

    chunks = await crud.bulk_create_chunks(
        [_chunk(pdf, 2), _chunk(pdf, 0), _chunk(pdf, 1)], owner.uuid
    )

    assert [c.chunk_index for c in chunks] == [0, 1, 2]


async def test_bulk_create_chunks_ignores_chunks_that_already_exist(
    db_ctx: DBContext, factory: Factory
):
    owner, pdf = await _pdf(factory)
    crud = db_ctx.crud(PdfChunkEmbeddingCrud)
    await crud.bulk_create_chunks([_chunk(pdf, 0, "original")], owner.uuid)

    chunks = await crud.bulk_create_chunks(
        [_chunk(pdf, 0, "duplicate"), _chunk(pdf, 1, "new")], owner.uuid
    )

    assert [(c.chunk_index, c.chunk_text) for c in chunks] == [
        (0, "original"),
        (1, "new"),
    ]


async def test_fetch_chunks_by_pdf_file_uuid_only_returns_that_files_chunks(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)
    pdf_a = await factory.file(project, mime_type="application/pdf")
    pdf_b = await factory.file(project, mime_type="application/pdf")
    crud = db_ctx.crud(PdfChunkEmbeddingCrud)
    await crud.bulk_create_chunks([_chunk(pdf_a, 0), _chunk(pdf_a, 1)], owner.uuid)
    await crud.bulk_create_chunks([_chunk(pdf_b, 0)], owner.uuid)

    found = await crud.fetch_chunks_by_pdf_file_uuid(pdf_a.uuid, owner.uuid)

    assert len(found) == 2
    assert {c.pdf_file_uuid for c in found} == {pdf_a.uuid}


async def test_fetch_chunks_by_pdf_file_uuid_is_empty_when_there_are_none(
    db_ctx: DBContext, factory: Factory
):
    owner, pdf = await _pdf(factory)

    found = await db_ctx.crud(PdfChunkEmbeddingCrud).fetch_chunks_by_pdf_file_uuid(
        pdf.uuid, owner.uuid
    )

    assert found == []


async def test_fetch_chunks_by_pdf_file_uuid_hides_other_owners_chunks(
    db_ctx: DBContext, factory: Factory
):
    owner, pdf = await _pdf(factory)
    bob = await factory.user()
    crud = db_ctx.crud(PdfChunkEmbeddingCrud)
    await crud.bulk_create_chunks([_chunk(pdf, 0)], owner.uuid)

    assert await crud.fetch_chunks_by_pdf_file_uuid(pdf.uuid, bob.uuid) == []


async def test_bulk_create_chunks_returns_nothing_for_other_owner(
    db_ctx: DBContext, factory: Factory
):
    """The insert itself is not owner-checked, but the returned rows are."""
    _, pdf = await _pdf(factory)
    bob = await factory.user()

    chunks = await db_ctx.crud(PdfChunkEmbeddingCrud).bulk_create_chunks(
        [_chunk(pdf, 0)], bob.uuid
    )

    assert chunks == []


async def test_chunks_are_deleted_with_their_pdf_file(
    db_ctx: DBContext, factory: Factory
):
    owner, pdf = await _pdf(factory)
    crud = db_ctx.crud(PdfChunkEmbeddingCrud)
    await crud.bulk_create_chunks([_chunk(pdf, 0)], owner.uuid)

    await db_ctx.crud(FileCrud).delete_file(pdf, owner.uuid)

    assert await crud.fetch_chunks_by_pdf_file_uuid(pdf.uuid, owner.uuid) == []
