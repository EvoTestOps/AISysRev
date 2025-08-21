from sqlalchemy.ext.asyncio import AsyncSession
from src.schemas.project import Criteria
from src.services.openrouter_service import get_openrouter_service
from src.schemas.job import JobCreate
from src.models.jobtask import JobTask
from src.core.llm import (
    task_prompt,
    StructuredResponse,
)


def _create_criteria(
    inclusion_criteria: list[str], exclusion_criteria: list[str]
) -> str:
    criteria = "\nInclusion criteria:\n\n"
    for i, criterion in enumerate(inclusion_criteria):
        criteria += f"- IC{i+1}: {criterion}\n"
    criteria += "\nExclusion criteria:\n\n"
    for i, criterion in enumerate(exclusion_criteria):
        criteria += f"- EC{i+1}: {criterion}\n"
    return criteria


async def get_structured_response(
    db: AsyncSession, job_task_data: JobTask, job_data: JobCreate, inc_exc_criteria: Criteria
) -> StructuredResponse:
    openrouter_service = get_openrouter_service(db)
    # TODO: Move to another place
    additional_instructions = "The paper is included, if all inclusion criteria match. If the paper matches any exclusion criteria, it is excluded."
    llm_model = job_data.llm_config.model_name

    criteria = _create_criteria(
        inc_exc_criteria["inclusion_criteria"], inc_exc_criteria["exclusion_criteria"]
    )
    prompt_text = task_prompt.format(
        job_task_data.title, job_task_data.abstract, criteria, additional_instructions
    )
    result = await openrouter_service.call_llm(
        schema=StructuredResponse, model=llm_model, prompt=prompt_text
    )

    return result
