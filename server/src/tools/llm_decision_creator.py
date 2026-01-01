from src.schemas.llm import ProviderRuntimeConfiguration
from src.schemas.paper import PaperHumanResult, PaperRead
from src.services.paper_service import get_paper_service
from sqlalchemy.ext.asyncio import AsyncSession
from src.schemas.project import Criteria
from src.services.llm_service import get_llm_service
from src.schemas.job import (
    FewShotPromptingConfig,
    JobCreate,
    ZeroShotPromptingConfig,
)
from src.db.models.jobtask import JobTask
from src.schemas.llm import StructuredResponse
from src.core.prompts import zero_shot_task_prompt, few_shot_task_prompt
from src.services.setting_service import get_setting_service


def _create_few_shot_examples(papers: list[PaperRead]):
    txt_parts = []

    for paper in papers:
        txt_parts.append(
            f"""Title: {paper.title}
Abstract: \"{paper.abstract}\"
Decision: {"Include" if paper.human_result == PaperHumanResult.INCLUDE else "Exclude"}
"""
        )

    return "\n\n".join(txt_parts)


def _create_criteria(
    inclusion_criteria: list[str], exclusion_criteria: list[str]
) -> str:
    criteria = "\nInclusion criteria:\n\n"
    for i, criterion in enumerate(inclusion_criteria):
        criteria += f"- IC{i + 1}: {criterion}\n"
    criteria += "\nExclusion criteria:\n\n"
    for i, criterion in enumerate(exclusion_criteria):
        criteria += f"- EC{i + 1}: {criterion}\n"
    return criteria


async def get_structured_response(
    db: AsyncSession,
    job_task_data: JobTask,
    job_data: JobCreate,
    inc_exc_criteria: Criteria,
) -> StructuredResponse:
    llm_service = get_llm_service(db)
    paper_service = get_paper_service(db)
    setting_service = get_setting_service(db)
    # TODO: Move to another place
    additional_instructions = "The paper is included, if all inclusion criteria match. If the paper matches any exclusion criteria, it is excluded."

    criteria = _create_criteria(
        # TODO: Fix
        inc_exc_criteria["inclusion_criteria"],
        inc_exc_criteria["exclusion_criteria"],  # type: ignore
    )
    cfg = job_data.prompting_config
    llm = llm_service.get_llm(job_data.llm_config.provider_name)
    if llm.api_key_config_parameter is not None:
        api_key = await setting_service.get_setting(
            llm.api_key_config_parameter.key, mask_secret=True
        )
        if api_key is None:
            raise RuntimeError(
                f"API key {llm.api_key_config_parameter.key} for provider {job_data.llm_config.provider_name} is missing"
            )
    if isinstance(cfg, ZeroShotPromptingConfig):
        prompt_text = zero_shot_task_prompt.format(
            job_task_data.title,
            job_task_data.abstract,
            criteria,
            additional_instructions,
        )

        result = await llm_service.call_llm(
            llm,
            model_configuration=job_data.llm_config.configuration,
            runtime_configuration=ProviderRuntimeConfiguration(model="", api_key=""),
            schema=StructuredResponse,
            prompt=prompt_text,
        )
        return result
    elif isinstance(cfg, FewShotPromptingConfig):
        seed_paper_uuids = list(cfg.seed_paper_inc + cfg.seed_paper_exc)
        seed_papers = await paper_service.fetch_papers_by_paper_uuids(seed_paper_uuids)
        seed_paper_txt = _create_few_shot_examples(seed_papers)
        prompt_text = few_shot_task_prompt.format(
            job_task_data.title,
            job_task_data.abstract,
            criteria,
            additional_instructions,
            seed_paper_txt,
        )
        api_key = await setting_service.get_setting(
            f"{job_data.llm_config.provider_name}_api_key", mask_secret=False
        )
        if api_key is None:
            raise RuntimeError(
                f"API key for provider {job_data.llm_config.provider_name} is missing"
            )
        result = await llm_service.call_llm(
            schema=StructuredResponse,
            llm_config=job_data.llm_config,
            prompt=prompt_text,
            api_key=api_key,
        )
        return result
    else:
        raise RuntimeError("Unknown prompting type.")
