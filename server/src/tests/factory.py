"""Row factory for the CRUD tests.

Creates rows straight through the ORM models (not through the CRUD classes) so
that a test of one CRUD does not depend on another one for its arrange step.
Everything is flushed but never committed: the `db_ctx` fixture rolls back after
each test, so tests leave no data behind.
"""

import itertools
from typing import Any
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from src.db.db_context import DBContext
from src.db.models.file import File
from src.db.models.job import Job
from src.db.models.jobtask import JobTask
from src.db.models.paper import Paper
from src.db.models.project import Project
from src.db.models.user import User
from src.schemas.job import JobScreeningMode


class Factory:
    def __init__(self, db_ctx: DBContext):
        assert db_ctx.session is not None
        self.session: AsyncSession = db_ctx.session
        self._paper_ids = itertools.count(1)

    async def _add(self, obj):
        self.session.add(obj)
        await self.session.flush()
        await self.session.refresh(obj)
        return obj

    async def flush(self) -> None:
        await self.session.flush()

    async def reload(self, obj):
        """Re-read a row after a bulk UPDATE, which does not touch loaded objects."""
        await self.session.refresh(obj)
        return obj

    async def user(self, sub: str | None = None, email: str | None = None) -> User:
        sub = sub or f"crud-test-{uuid4()}"
        return await self._add(User(sub=sub, email=email or f"{sub}@test.local"))

    async def project(self, owner: User, name: str = "Project", **kwargs) -> Project:
        return await self._add(
            Project(
                owner_uuid=owner.uuid,
                name=name,
                criteria=kwargs.pop(
                    "criteria",
                    {"inclusion_criteria": ["A"], "exclusion_criteria": ["B"]},
                ),
                **kwargs,
            )
        )

    async def file(
        self,
        project: Project,
        filename: str = "papers.csv",
        mime_type: str = "text/csv",
        storage_path: str | None = None,
    ) -> File:
        return await self._add(
            File(
                project_uuid=project.uuid,
                filename=filename,
                mime_type=mime_type,
                storage_path=storage_path,
            )
        )

    async def paper(
        self,
        project: Project,
        file: File | None = None,
        pdf_file: File | None = None,
        **kwargs: Any,
    ) -> Paper:
        # A paper needs at least one source file (check constraint)
        if file is None and pdf_file is None:
            file = await self.file(project)
        return await self._add(
            Paper(
                project_uuid=project.uuid,
                paper_id=kwargs.pop("paper_id", next(self._paper_ids)),
                file_uuid=file.uuid if file else None,
                pdf_file_uuid=pdf_file.uuid if pdf_file else None,
                doi=kwargs.pop("doi", None),
                title=kwargs.pop("title", "A title"),
                abstract=kwargs.pop("abstract", "An abstract"),
                **kwargs,
            )
        )

    async def job(
        self,
        project: Project,
        prompting_config: dict | None = None,
        model_name: str = "test-model",
        screening_mode: JobScreeningMode = JobScreeningMode.TEXT,
    ) -> Job:
        return await self._add(
            Job(
                project_id=project.id,
                llm_config={
                    "provider_name": "Test provider",
                    "model_name": model_name,
                    "provider_parameters": {},
                    "model_parameters": {},
                },
                prompting_config=prompting_config
                or {"screening_type": "ZERO_SHOT", "screening_target": "PAPER"},
                screening_mode=screening_mode,
            )
        )

    async def jobtask(
        self,
        job: Job,
        paper: Paper,
        status: str = "NOT_STARTED",
        result: dict | None = None,
        error: str | None = None,
    ) -> JobTask:
        return await self._add(
            JobTask(
                job_id=job.id,
                paper_uuid=paper.uuid,
                title=paper.title,
                abstract=paper.abstract,
                doi=paper.doi,
                status=status,
                result=result,
                error=error,
            )
        )
