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
        project = await self.db.execute(select(Project).where(Project.uuid == project_uuid))
        project_obj = project.scalar_one_or_none()
        if not project_obj:
            raise ValueError("Project not found when creating result")
        project_id = project_obj.id

        stmt = (
            select(
                Paper.title,
                Paper.abstract,
                Paper.doi,
                Paper.human_result,
                Job.llm_config["model_name"].astext.label("model_name"),
                JobTask.result["overall_decision"]["binary_decision"].astext.label("binary_decision")
            )
            .join(JobTask, JobTask.paper_uuid == Paper.uuid)
            .join(Job, Job.id == JobTask.job_id)
            .join(Project, Project.id == Job.project_id)
            .where(Project.id == project_id)
        )
        result = await self.db.execute(stmt)
        return result.all()