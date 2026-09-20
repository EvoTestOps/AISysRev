from uuid import uuid4

import pytest
from sqlalchemy.exc import IntegrityError

from src.crud.paper_crud import PaperCrud
from src.db.db_context import DBContext
from src.schemas.job import JobScreeningMode
from src.schemas.paper import PaperCreate, PaperHumanResult
from src.tests.factory import Factory

pytestmark = pytest.mark.asyncio


def _paper_data(project, file=None, pdf_file=None, paper_id=1, **kwargs):
    return PaperCreate(
        paper_id=paper_id,
        project_uuid=project.uuid,
        file_uuid=file.uuid if file else None,
        pdf_file_uuid=pdf_file.uuid if pdf_file else None,
        doi=kwargs.pop("doi", None),
        title=kwargs.pop("title", "Title"),
        abstract=kwargs.pop("abstract", "Abstract"),
    )


async def test_bulk_create_papers_creates_and_returns_the_papers(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)
    file = await factory.file(project)
    crud = db_ctx.crud(PaperCrud)

    created = await crud.bulk_create_papers(
        [
            _paper_data(project, file, paper_id=1, title="One", doi="10.1/one"),
            _paper_data(project, file, paper_id=2, title="Two"),
        ]
    )

    assert [p.title for p in created] == ["One", "Two"]
    assert created[0].doi == "10.1/one"
    assert created[1].doi is None
    assert all(p.uuid is not None for p in created)
    assert len(await crud.fetch_papers_by_project_uuid(project.uuid, owner.uuid)) == 2


async def test_bulk_create_papers_rejects_paper_without_any_source_file(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)

    with pytest.raises(IntegrityError):
        await db_ctx.crud(PaperCrud).bulk_create_papers([_paper_data(project)])


async def test_bulk_create_papers_rejects_duplicate_paper_id_in_project(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)
    file = await factory.file(project)

    with pytest.raises(IntegrityError):
        await db_ctx.crud(PaperCrud).bulk_create_papers(
            [
                _paper_data(project, file, paper_id=7),
                _paper_data(project, file, paper_id=7),
            ]
        )


async def test_same_paper_id_is_allowed_in_different_projects(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project_a = await factory.project(owner)
    project_b = await factory.project(owner)
    crud = db_ctx.crud(PaperCrud)

    created = await crud.bulk_create_papers(
        [
            _paper_data(project_a, await factory.file(project_a), paper_id=1),
            _paper_data(project_b, await factory.file(project_b), paper_id=1),
        ]
    )

    assert len(created) == 2


async def test_fetch_paper_by_uuid(db_ctx: DBContext, factory: Factory):
    owner = await factory.user()
    paper = await factory.paper(await factory.project(owner), title="Findable")

    found = await db_ctx.crud(PaperCrud).fetch_paper_by_uuid(paper.uuid, owner.uuid)

    assert found is not None
    assert found.title == "Findable"


async def test_fetch_paper_by_uuid_hides_other_owners_papers(
    db_ctx: DBContext, factory: Factory
):
    alice = await factory.user()
    bob = await factory.user()
    paper = await factory.paper(await factory.project(alice))

    assert (
        await db_ctx.crud(PaperCrud).fetch_paper_by_uuid(paper.uuid, bob.uuid) is None
    )


async def test_fetch_paper_by_uuid_returns_none_for_unknown_uuid(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()

    assert await db_ctx.crud(PaperCrud).fetch_paper_by_uuid(uuid4(), owner.uuid) is None


async def test_fetch_papers_by_project_uuid_is_scoped_to_project_and_owner(
    db_ctx: DBContext, factory: Factory
):
    alice = await factory.user()
    bob = await factory.user()
    project = await factory.project(alice)
    other_project = await factory.project(alice)
    mine = await factory.paper(project)
    await factory.paper(other_project)
    crud = db_ctx.crud(PaperCrud)

    found = await crud.fetch_papers_by_project_uuid(project.uuid, alice.uuid)

    assert [p.uuid for p in found] == [mine.uuid]
    assert await crud.fetch_papers_by_project_uuid(project.uuid, bob.uuid) == []


async def test_fetch_papers_by_paper_uuids(db_ctx: DBContext, factory: Factory):
    owner = await factory.user()
    project = await factory.project(owner)
    p1 = await factory.paper(project)
    p2 = await factory.paper(project)
    await factory.paper(project)
    crud = db_ctx.crud(PaperCrud)

    found = await crud.fetch_papers_by_paper_uuids(
        [str(p1.uuid), str(p2.uuid), str(uuid4())], owner.uuid
    )

    assert sorted(p.uuid for p in found) == sorted([p1.uuid, p2.uuid])


async def test_fetch_papers_by_paper_uuids_hides_other_owners_papers(
    db_ctx: DBContext, factory: Factory
):
    alice = await factory.user()
    bob = await factory.user()
    paper = await factory.paper(await factory.project(alice))

    found = await db_ctx.crud(PaperCrud).fetch_papers_by_paper_uuids(
        [str(paper.uuid)], bob.uuid
    )

    assert found == []


async def test_delete_papers_deletes_only_the_owners_matching_papers(
    db_ctx: DBContext, factory: Factory
):
    alice = await factory.user()
    bob = await factory.user()
    project = await factory.project(alice)
    mine_1 = await factory.paper(project)
    mine_2 = await factory.paper(project)
    kept = await factory.paper(project)
    bobs = await factory.paper(await factory.project(bob))
    crud = db_ctx.crud(PaperCrud)

    deleted = await crud.delete_papers(
        [mine_1.uuid, mine_2.uuid, bobs.uuid, uuid4()], alice.uuid
    )
    await factory.flush()

    assert sorted(deleted) == sorted([mine_1.uuid, mine_2.uuid])
    remaining = await crud.fetch_papers_by_project_uuid(project.uuid, alice.uuid)
    assert [p.uuid for p in remaining] == [kept.uuid]
    assert await crud.fetch_paper_by_uuid(bobs.uuid, bob.uuid) is not None


async def test_delete_papers_with_empty_list_deletes_nothing(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()

    assert await db_ctx.crud(PaperCrud).delete_papers([], owner.uuid) == []


async def test_add_paper_human_result_stores_the_decision(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    paper = await factory.paper(await factory.project(owner))
    crud = db_ctx.crud(PaperCrud)

    await crud.add_paper_human_result(paper.uuid, owner.uuid, PaperHumanResult.UNSURE)

    found = await crud.fetch_paper_by_uuid(paper.uuid, owner.uuid)
    assert found is not None
    assert found.human_result is not None
    assert found.human_result.value == "UNSURE"


async def test_add_paper_human_result_can_be_overwritten(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    paper = await factory.paper(await factory.project(owner))
    crud = db_ctx.crud(PaperCrud)
    await crud.add_paper_human_result(paper.uuid, owner.uuid, PaperHumanResult.INCLUDE)

    await crud.add_paper_human_result(paper.uuid, owner.uuid, PaperHumanResult.EXCLUDE)

    found = await crud.fetch_paper_by_uuid(paper.uuid, owner.uuid)
    assert found is not None and found.human_result is not None
    assert found.human_result.value == "EXCLUDE"


async def test_add_paper_human_result_ignores_other_owners(
    db_ctx: DBContext, factory: Factory
):
    alice = await factory.user()
    bob = await factory.user()
    paper = await factory.paper(await factory.project(alice))
    crud = db_ctx.crud(PaperCrud)

    await crud.add_paper_human_result(paper.uuid, bob.uuid, PaperHumanResult.INCLUDE)

    found = await crud.fetch_paper_by_uuid(paper.uuid, alice.uuid)
    assert found is not None
    assert found.human_result is None


async def test_count_papers_with_human_results(db_ctx: DBContext, factory: Factory):
    owner = await factory.user()
    project = await factory.project(owner)
    other_project = await factory.project(owner)
    p1 = await factory.paper(project)
    p2 = await factory.paper(project)
    await factory.paper(project)
    other = await factory.paper(other_project)
    crud = db_ctx.crud(PaperCrud)
    await crud.add_paper_human_result(p1.uuid, owner.uuid, PaperHumanResult.INCLUDE)
    await crud.add_paper_human_result(p2.uuid, owner.uuid, PaperHumanResult.EXCLUDE)
    await crud.add_paper_human_result(other.uuid, owner.uuid, PaperHumanResult.INCLUDE)

    assert await crud.count_papers_with_human_results(project.uuid, owner.uuid) == 2
    assert (
        await crud.count_papers_with_human_results(other_project.uuid, owner.uuid) == 1
    )


async def test_count_papers_with_human_results_is_zero_for_other_owner(
    db_ctx: DBContext, factory: Factory
):
    alice = await factory.user()
    bob = await factory.user()
    project = await factory.project(alice)
    paper = await factory.paper(project)
    crud = db_ctx.crud(PaperCrud)
    await crud.add_paper_human_result(paper.uuid, alice.uuid, PaperHumanResult.INCLUDE)

    assert await crud.count_papers_with_human_results(project.uuid, bob.uuid) == 0


async def test_fetch_max_paper_id_is_zero_for_empty_project(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)

    assert (
        await db_ctx.crud(PaperCrud).fetch_max_paper_id(project.uuid, owner.uuid) == 0
    )


async def test_fetch_max_paper_id_returns_the_highest_id_in_the_project(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)
    other_project = await factory.project(owner)
    await factory.paper(project, paper_id=3)
    await factory.paper(project, paper_id=11)
    await factory.paper(project, paper_id=5)
    await factory.paper(other_project, paper_id=99)
    crud = db_ctx.crud(PaperCrud)

    assert await crud.fetch_max_paper_id(project.uuid, owner.uuid) == 11


async def test_fetch_max_paper_id_is_zero_for_other_owner(
    db_ctx: DBContext, factory: Factory
):
    alice = await factory.user()
    bob = await factory.user()
    project = await factory.project(alice)
    await factory.paper(project, paper_id=4)

    assert await db_ctx.crud(PaperCrud).fetch_max_paper_id(project.uuid, bob.uuid) == 0


async def _papers_by_source(factory: Factory, project):
    csv = await factory.file(project)
    pdf = await factory.file(project, mime_type="application/pdf")
    text_only = await factory.paper(project, file=csv)
    pdf_only = await factory.paper(project, pdf_file=pdf)
    both = await factory.paper(project, file=csv, pdf_file=pdf)
    return text_only, pdf_only, both


async def test_fetch_papers_for_screening_text_mode_needs_a_csv_source(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)
    text_only, _, both = await _papers_by_source(factory, project)

    found = await db_ctx.crud(PaperCrud).fetch_papers_for_screening(
        project.uuid, owner.uuid, JobScreeningMode.TEXT
    )

    assert sorted(p.uuid for p in found) == sorted([text_only.uuid, both.uuid])


async def test_fetch_papers_for_screening_pdf_mode_needs_a_pdf(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)
    _, pdf_only, both = await _papers_by_source(factory, project)

    found = await db_ctx.crud(PaperCrud).fetch_papers_for_screening(
        project.uuid, owner.uuid, JobScreeningMode.PDF
    )

    assert sorted(p.uuid for p in found) == sorted([pdf_only.uuid, both.uuid])


async def test_fetch_papers_for_screening_automatic_mode_takes_every_paper(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)
    papers = await _papers_by_source(factory, project)

    found = await db_ctx.crud(PaperCrud).fetch_papers_for_screening(
        project.uuid, owner.uuid, JobScreeningMode.AUTOMATIC
    )

    assert sorted(p.uuid for p in found) == sorted(p.uuid for p in papers)


async def test_fetch_papers_for_screening_is_empty_for_other_owner(
    db_ctx: DBContext, factory: Factory
):
    alice = await factory.user()
    bob = await factory.user()
    project = await factory.project(alice)
    await factory.paper(project)

    found = await db_ctx.crud(PaperCrud).fetch_papers_for_screening(
        project.uuid, bob.uuid, JobScreeningMode.AUTOMATIC
    )

    assert found == []


async def test_set_paper_pdf_file_uuid_attaches_the_pdf(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)
    paper = await factory.paper(project)
    pdf = await factory.file(project, mime_type="application/pdf")

    updated = await db_ctx.crud(PaperCrud).set_paper_pdf_file_uuid(
        paper.uuid, owner.uuid, pdf.uuid
    )

    assert updated is not None
    assert updated.uuid == paper.uuid
    assert updated.pdf_file_uuid == pdf.uuid


async def test_set_paper_pdf_file_uuid_returns_none_for_other_owner(
    db_ctx: DBContext, factory: Factory
):
    alice = await factory.user()
    bob = await factory.user()
    project = await factory.project(alice)
    paper = await factory.paper(project)
    pdf = await factory.file(project, mime_type="application/pdf")

    updated = await db_ctx.crud(PaperCrud).set_paper_pdf_file_uuid(
        paper.uuid, bob.uuid, pdf.uuid
    )

    assert updated is None
    await factory.reload(paper)
    assert paper.pdf_file_uuid is None


async def test_fetch_papers_missing_pdf(db_ctx: DBContext, factory: Factory):
    owner = await factory.user()
    project = await factory.project(owner)
    pdf = await factory.file(project, mime_type="application/pdf")
    missing = await factory.paper(project)
    await factory.paper(project, pdf_file=pdf)
    crud = db_ctx.crud(PaperCrud)

    found = await crud.fetch_papers_missing_pdf(project.uuid, owner.uuid)

    assert [p.uuid for p in found] == [missing.uuid]


async def test_fetch_papers_missing_pdf_is_empty_for_other_owner(
    db_ctx: DBContext, factory: Factory
):
    alice = await factory.user()
    bob = await factory.user()
    project = await factory.project(alice)
    await factory.paper(project)

    assert (
        await db_ctx.crud(PaperCrud).fetch_papers_missing_pdf(project.uuid, bob.uuid)
        == []
    )


async def test_fetch_papers_with_model_evals_averages_probabilities(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)
    paper = await factory.paper(project)
    job = await factory.job(project)
    for probability in (0.8, 0.4):
        await factory.jobtask(
            job,
            paper,
            status="DONE",
            result={"overall_decision": {"probability_decision": probability}},
        )

    rows = await db_ctx.crud(PaperCrud).fetch_papers_with_model_evals_by_project_uuid(
        project.uuid, owner.uuid
    )

    assert len(rows) == 1
    assert rows[0]["Paper"].uuid == paper.uuid
    assert rows[0]["avg_probability_decision"] == pytest.approx(0.6)
    assert rows[0]["error_messages"] is None


async def test_fetch_papers_with_model_evals_without_job_tasks(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)
    paper = await factory.paper(project)

    rows = await db_ctx.crud(PaperCrud).fetch_papers_with_model_evals_by_project_uuid(
        project.uuid, owner.uuid
    )

    assert [r["Paper"].uuid for r in rows] == [paper.uuid]
    assert rows[0]["avg_probability_decision"] is None
    assert rows[0]["error_messages"] is None
    assert rows[0]["pdf_filename"] is None


async def test_fetch_papers_with_model_evals_collects_errors_and_pdf_filename(
    db_ctx: DBContext, factory: Factory
):
    owner = await factory.user()
    project = await factory.project(owner)
    pdf = await factory.file(project, filename="paper.pdf", mime_type="application/pdf")
    paper = await factory.paper(project, pdf_file=pdf)
    job = await factory.job(project)
    await factory.jobtask(job, paper, status="ERROR", error="rate limited")
    await factory.jobtask(job, paper, status="ERROR", error="timeout")
    await factory.jobtask(
        job,
        paper,
        status="DONE",
        result={"overall_decision": {"probability_decision": 0.5}},
    )

    rows = await db_ctx.crud(PaperCrud).fetch_papers_with_model_evals_by_project_uuid(
        project.uuid, owner.uuid
    )

    assert len(rows) == 1
    assert sorted(rows[0]["error_messages"]) == ["rate limited", "timeout"]
    assert rows[0]["pdf_filename"] == "paper.pdf"
    assert rows[0]["avg_probability_decision"] == pytest.approx(0.5)


async def test_fetch_papers_with_model_evals_is_empty_for_other_owner(
    db_ctx: DBContext, factory: Factory
):
    alice = await factory.user()
    bob = await factory.user()
    project = await factory.project(alice)
    await factory.paper(project)

    rows = await db_ctx.crud(PaperCrud).fetch_papers_with_model_evals_by_project_uuid(
        project.uuid, bob.uuid
    )

    assert rows == []
