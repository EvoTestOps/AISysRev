from uuid import uuid4

import pytest

from src.schemas.paper import PaperRead
from src.tools.ris_file_builder import build_ris_file

pytestmark = pytest.mark.unit


def _paper(title="A title", abstract="An abstract", doi: str | None = "10.1/x"):
    return PaperRead(
        uuid=uuid4(),
        paper_id=1,
        project_uuid=uuid4(),
        doi=doi,
        title=title,
        abstract=abstract,
    )


def test_a_complete_paper_becomes_one_journal_entry():
    ris = build_ris_file([_paper()])

    assert ris == "TY  - JOUR\nTI  - A title\nAB  - An abstract\nDO  - 10.1/x\nER  - \n"


def test_doi_line_is_left_out_when_the_paper_has_no_doi():
    ris = build_ris_file([_paper(doi=None)])

    assert "DO  -" not in ris
    assert "TI  - A title" in ris


def test_abstract_line_is_left_out_for_the_no_abstract_placeholder():
    ris = build_ris_file([_paper(abstract="NO_ABSTRACT")])

    assert "AB  -" not in ris


def test_abstract_line_is_left_out_for_an_empty_abstract():
    ris = build_ris_file([_paper(abstract="")])

    assert "AB  -" not in ris


def test_entries_are_separated_by_a_blank_line_and_keep_their_order():
    ris = build_ris_file([_paper(title="First"), _paper(title="Second")])

    entries = ris.strip("\n").split("\n\n")
    assert len(entries) == 2
    assert "TI  - First" in entries[0]
    assert "TI  - Second" in entries[1]
    assert all(e.startswith("TY  - JOUR") and e.endswith("ER  - ") for e in entries)


def test_every_entry_starts_with_ty_and_ends_with_er():
    ris = build_ris_file([_paper(), _paper(doi=None), _paper(abstract="")])

    assert ris.count("TY  - JOUR") == 3
    assert ris.count("ER  - ") == 3
    assert ris.endswith("\n")


def test_no_papers_gives_just_a_newline():
    assert build_ris_file([]) == "\n"
