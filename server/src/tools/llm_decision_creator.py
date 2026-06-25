from httpx import AsyncClient


from src.core.prompts import (
    additional_instructions,
    few_shot_task_prompt,
    per_criteria_task_prompt,
    zero_shot_task_prompt,
    github_additional_instructions,
    github_zero_shot_task_prompt,
    github_few_shot_task_prompt
)
from src.db.models.jobtask import JobTask
from src.schemas.job import FewShotPromptingConfig, JobCreate, ZeroShotPromptingConfig
from src.schemas.llm import (
    CriterionResponse,
    ProviderRuntimeParameters,
    StructuredResponse,

)

from src.schemas.paper import PaperHumanResult, PaperRead
from src.schemas.project import Criteria
from src.schemas.setting import SettingRead
from src.services.llm_service import LLMService
from src.services.paper_service import PaperService


def create_few_shot_examples(papers: list[PaperRead]):
    txt_parts = []

    for paper in papers:
        txt_parts.append(f"""Title: {paper.title}
Abstract: \"{paper.abstract}\"
Decision: {"Include" if paper.human_result == PaperHumanResult.INCLUDE else "Exclude"}
""")

    return "\n\n".join(txt_parts)


def create_criteria(
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
    llm_service: LLMService,
    paper_service: PaperService,
    job_task_data: JobTask,
    job_data: JobCreate,
    inc_exc_criteria: Criteria,
    client: AsyncClient,
) -> StructuredResponse:
    criteria = create_criteria(
        # TODO: Fix
        inc_exc_criteria["inclusion_criteria"],  # type: ignore
        inc_exc_criteria["exclusion_criteria"],  # type: ignore
    )

    screening_target = getattr(
    job_data.prompting_config,
    "screening_target",
    "PAPER",
    )

    is_github_screening = screening_target == "GITHUB_REPOSITORY"

    used_additional_instructions = (
        github_additional_instructions
        if is_github_screening
        else additional_instructions
    )
    api_key: SettingRead | None = None
    cfg = job_data.prompting_config
    llm = llm_service.get_llm(job_data.llm_config.provider_name)
    if llm.api_key_config_parameter is not None:
        api_key = await llm_service.setting_service.get_setting(
            llm.api_key_config_parameter.key, mask_secret=False
        )
        if api_key is None:
            raise RuntimeError(
                f"API key {llm.api_key_config_parameter.key} for provider {job_data.llm_config.provider_name} is missing"
            )

    if isinstance(cfg, ZeroShotPromptingConfig):
        prompt_template = (
            github_zero_shot_task_prompt
            if is_github_screening
            else zero_shot_task_prompt
        )
        prompt_text = prompt_template.format(
            job_task_data.title,
            job_task_data.abstract,
            criteria,
            used_additional_instructions,
        )
        result = await llm_service.call_llm(
            llm,
            provider_parameters=job_data.llm_config.provider_parameters,
            model_parameters=job_data.llm_config.model_parameters,
            runtime_parameters=ProviderRuntimeParameters(
                model=job_data.llm_config.model_name,
                api_key=api_key.value if api_key is not None else "Mock",  # type: ignore
            ),
            response_schema=StructuredResponse,
            user_prompt=prompt_text,
            client=client,
        )
        return result
    elif isinstance(cfg, FewShotPromptingConfig):
        seed_paper_uuids = list(cfg.seed_paper_inc + cfg.seed_paper_exc)
        seed_papers = await paper_service.fetch_papers_by_paper_uuids(seed_paper_uuids)
        seed_paper_txt = create_few_shot_examples(seed_papers)
        prompt_template = (
            github_few_shot_task_prompt
            if is_github_screening
            else few_shot_task_prompt
        )

        prompt_text = prompt_template.format(
            job_task_data.title,
            job_task_data.abstract,
            criteria,
            used_additional_instructions,
            seed_paper_txt,
        )
        result = await llm_service.call_llm(
            llm,
            provider_parameters=job_data.llm_config.provider_parameters,
            model_parameters=job_data.llm_config.model_parameters,
            runtime_parameters=ProviderRuntimeParameters(
                model=job_data.llm_config.model_name,
                api_key=api_key.value if api_key is not None else "Mock",  # type: ignore
            ),
            response_schema=StructuredResponse,
            user_prompt=prompt_text,
            client=client,
        )
        return result
    else:
        raise RuntimeError("Unknown prompting type.")


async def get_single_criterion_response(
    llm_service: LLMService,
    job_data: JobCreate,
    title: str,
    abstract: str,
    criterion_description: str,
    client: AsyncClient,
) -> CriterionResponse:
    llm = llm_service.get_llm(job_data.llm_config.provider_name)

    api_key: SettingRead | None = None
    if llm.api_key_config_parameter is not None:
        api_key = await llm_service.setting_service.get_setting(
            llm.api_key_config_parameter.key, mask_secret=False
        )
        if api_key is None:
            raise RuntimeError(
                f"API key {llm.api_key_config_parameter.key} for provider "
                f"{job_data.llm_config.provider_name} is missing"
            )

    prompt_text = per_criteria_task_prompt.format(
        title, abstract, criterion_description
    )
    return await llm_service.call_llm(
        llm,
        provider_parameters=job_data.llm_config.provider_parameters,
        model_parameters=job_data.llm_config.model_parameters,
        runtime_parameters=ProviderRuntimeParameters(
            model=job_data.llm_config.model_name,
            api_key=api_key.value if api_key is not None else "Mock",  # type: ignore
        ),
        response_schema=CriterionResponse,
        user_prompt=prompt_text,
        client=client,
    )
