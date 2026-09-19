from uuid import uuid4

import pytest

from src.crud.file_crud import FileCrud
from src.crud.paper_crud import PaperCrud
from src.db.db_context import DBContext
from src.schemas.file import FileCreate
from src.tests.factory import Factory

pytestmark = pytest.mark.asyncio


async def test_create_file_record_stores_the_file(db_ctx: DBContext, factory: Factory):
    owner = await factory.user()
    project = await factory.project(owner)
    crud = db_ctx.crud(FileCrud)

    created = await crud.create_file_record(
        FileCreate(
            project_uuid=project.uuid,
            filename="a.pdf",
            mime_type="application/pdf",
            storage_path="pdfs/a.pdf",
        )
    )

    assert created.uuid is not None
    assert created.project_uuid == project.uuid
    assert created.filename == "a.pdf"
    assert created.mime_type == "application/pdf"
    assert created.storage_path == "pdfs/a.pdf"


async def test_create_file_record_without_storage_path(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)

    created = await db_ctx.crud(FileCrud).create_file_record(
        FileCreate(project_uuid=project.uuid, filename="a.csv", mime_type="text/csv")
    )

    assert created.storage_path is None


async def test_fetch_file_by_uuid_returns_the_file(db_ctx: DBContext, factory: Factory):
    owner = await factory.user()
    project = await factory.project(owner)
    file = await factory.file(project)

    found = await db_ctx.crud(FileCrud).fetch_file_by_uuid(file.uuid, owner.uuid)

    assert found is not None
    assert found.uuid == file.uuid


async def test_fetch_file_by_uuid_hides_other_owners_files(
    db_ctx: DBContext, factory: Factory
):
    alice = await factory.user()
    bob = await factory.user()
    file = await factory.file(await factory.project(alice))

    assert await db_ctx.crud(FileCrud).fetch_file_by_uuid(file.uuid, bob.uuid) is None


async def test_fetch_file_by_uuid_returns_none_for_unknown_uuid(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()

    assert await db_ctx.crud(FileCrud).fetch_file_by_uuid(uuid4(), owner.uuid) is None


async def test_fetch_files_counts_papers_referencing_each_file(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)
    csv = await factory.file(project, filename="papers.csv")
    pdf = await factory.file(project, filename="a.pdf", mime_type="application/pdf")
    unused = await factory.file(project, filename="unused.csv")
    await factory.paper(project, file=csv)
    await factory.paper(project, file=csv, pdf_file=pdf)
    await factory.paper(project, file=csv)

    files = await db_ctx.crud(FileCrud).fetch_files(project.uuid, owner.uuid)

    counts = {f["filename"]: f["paper_count"] for f in files}
    assert counts == {"papers.csv": 3, "a.pdf": 1, "unused.csv": 0}
    assert unused.uuid in {f["uuid"] for f in files}


async def test_fetch_files_only_returns_files_of_the_given_project(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)
    other_project = await factory.project(owner)
    await factory.file(project, filename="mine.csv")
    await factory.file(other_project, filename="other.csv")

    files = await db_ctx.crud(FileCrud).fetch_files(project.uuid, owner.uuid)

    assert [f["filename"] for f in files] == ["mine.csv"]


async def test_fetch_files_is_empty_for_other_owner(
    db_ctx: DBContext, factory: Factory
):
    alice = await factory.user()
    bob = await factory.user()
    project = await factory.project(alice)
    await factory.file(project)

    assert await db_ctx.crud(FileCrud).fetch_files(project.uuid, bob.uuid) == []


async def test_delete_files_deletes_only_the_owners_files(
    db_ctx: DBContext, factory: Factory
):
    alice = await factory.user()
    bob = await factory.user()
    alice_project = await factory.project(alice)
    bob_project = await factory.project(bob)
    mine_1 = await factory.file(alice_project)
    mine_2 = await factory.file(alice_project)
    kept = await factory.file(alice_project)
    bobs = await factory.file(bob_project)
    crud = db_ctx.crud(FileCrud)

    deleted = await crud.delete_files(
        [mine_1.uuid, mine_2.uuid, bobs.uuid, uuid4()], alice.uuid
    )
    await factory.flush()

    assert sorted(deleted) == sorted([mine_1.uuid, mine_2.uuid])
    assert await crud.fetch_file_by_uuid(mine_1.uuid, alice.uuid) is None
    assert await crud.fetch_file_by_uuid(kept.uuid, alice.uuid) is not None
    assert await crud.fetch_file_by_uuid(bobs.uuid, bob.uuid) is not None


async def test_delete_files_with_empty_list_deletes_nothing(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()

    assert await db_ctx.crud(FileCrud).delete_files([], owner.uuid) == []


async def test_delete_file_removes_the_file(db_ctx: DBContext, factory: Factory):
    owner = await factory.user()
    file = await factory.file(await factory.project(owner))
    crud = db_ctx.crud(FileCrud)

    await crud.delete_file(file, owner.uuid)

    assert await crud.fetch_file_by_uuid(file.uuid, owner.uuid) is None


async def test_delete_file_does_nothing_for_another_owner(
    db_ctx: DBContext, factory: Factory
):
    alice = await factory.user()
    bob = await factory.user()
    file = await factory.file(await factory.project(alice))
    crud = db_ctx.crud(FileCrud)

    await crud.delete_file(file, bob.uuid)

    assert await crud.fetch_file_by_uuid(file.uuid, alice.uuid) is not None


async def test_delete_file_cascades_to_papers_that_use_it_as_pdf(
    db_ctx: DBContext, factory: Factory
):
    # paper.pdf_file_uuid is ON DELETE CASCADE
    owner = await factory.user()
    project = await factory.project(owner)
    pdf = await factory.file(project, mime_type="application/pdf")
    paper = await factory.paper(project, pdf_file=pdf)
    crud = db_ctx.crud(FileCrud)

    await crud.delete_file(pdf, owner.uuid)

    assert (
        await db_ctx.crud(PaperCrud).fetch_paper_by_uuid(paper.uuid, owner.uuid) is None
    )


async def test_fetch_storage_paths_by_project_skips_files_without_a_path(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)
    await factory.file(project, storage_path="pdfs/a.pdf")
    await factory.file(project, storage_path="pdfs/b.pdf")
    await factory.file(project, storage_path=None)

    paths = await db_ctx.crud(FileCrud).fetch_storage_paths_by_project(
        project.uuid, owner.uuid
    )

    assert sorted(paths) == ["pdfs/a.pdf", "pdfs/b.pdf"]


async def test_fetch_storage_paths_by_project_is_scoped_to_owner_and_project(
    db_ctx: DBContext, factory: Factory
):
    alice = await factory.user()
    bob = await factory.user()
    project = await factory.project(alice)
    other_project = await factory.project(alice)
    await factory.file(project, storage_path="pdfs/mine.pdf")
    await factory.file(other_project, storage_path="pdfs/other-project.pdf")
    crud = db_ctx.crud(FileCrud)

    assert await crud.fetch_storage_paths_by_project(project.uuid, alice.uuid) == [
        "pdfs/mine.pdf"
    ]
    assert await crud.fetch_storage_paths_by_project(project.uuid, bob.uuid) == []


async def test_count_files_with_storage_path_counts_shared_paths(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)
    other_project = await factory.project(owner)
    path = f"pdfs/{uuid4()}.pdf"
    await factory.file(project, storage_path=path)
    await factory.file(other_project, storage_path=path)
    await factory.file(project, storage_path=f"pdfs/{uuid4()}.pdf")
    crud = db_ctx.crud(FileCrud)

    assert await crud.count_files_with_storage_path(path) == 2
    assert await crud.count_files_with_storage_path("pdfs/none.pdf") == 0
