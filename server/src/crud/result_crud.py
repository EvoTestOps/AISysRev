import pandas as pd
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.job import Job
from src.models.paper import Paper
from src.models.project import Project
from src.models.jobtask import JobTask


class ResultCrud:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_result(self, project_uuid: UUID) -> pd.DataFrame:
        stmt = (
            select(
                Paper.title,
                Paper.abstract,
                Paper.doi,
                Paper.human_result,
                Job.llm_config["model_name"].astext.label("model_name"),
                JobTask.result["overall_decision"]["reason"].astext.label("reason"),
                JobTask.result["overall_decision"]["binary_decision"].astext.label(
                    "binary_decision"
                ),
                JobTask.result["overall_decision"]["likert_decision"].astext.label(
                    "likert_decision"
                ),
                JobTask.result["overall_decision"]["probability_decision"].astext.label(
                    "probability_decision"
                ),
                JobTask.result["inclusion_criteria"].astext.label("inclusion_criteria"),
                JobTask.result["exclusion_criteria"].astext.label("exclusion_criteria"),
            )
            .select_from(Paper)
            .join(Project, Project.uuid == Paper.project_uuid)
            .outerjoin(JobTask, JobTask.paper_uuid == Paper.uuid)
            .outerjoin(Job, Job.id == JobTask.job_id)
            .where(Project.uuid == project_uuid)
        )
        result = await self.db.execute(stmt)
        return result.all()
