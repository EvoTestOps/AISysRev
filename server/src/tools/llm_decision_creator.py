from typing import Callable

from httpx2 import AsyncClient

from src.core.llm.providers.provider import LLMProvider
from src.core.prompt_template import render_template
from src.core.prompts import (
    additional_instructions,
    default_prompt_for,
    github_additional_instructions,
)
from src.db.models.jobtask import JobTask
from src.schemas.job import (
    FewShotPromptingConfig,
    JobCreate,
    JobPromptingType,
    JobScreeningMode,
    ZeroShotPromptingConfig,
)
from src.schemas.llm import (
    CriterionResponse,
    JevStructuredResponse,
    PromptRecord,
    ProviderRuntimeParameters,
    StructuredResponse,
)
from src.schemas.paper import PaperHumanResult, PaperRead
from src.schemas.project import ScreeningTarget
from src.schemas.prompt import ResolvedPrompt
from src.schemas.setting import SettingRead
from src.services.llm_service import LLMService
from src.services.paper_service import PaperService
from src.services.pdf_screening_service import PdfScreeningService

PromptRecorder = Callable[[PromptRecord], None]


def _record_prompt(
    on_prompt: PromptRecorder | None,
    llm: type[LLMProvider],
    system_prompt: str,
    user_prompt: str,
    criterion: str | None = None,
) -> None:
    """Reports the prompt about to be sent, so it is kept even if the call fails."""
    if on_prompt is None:
        return
    on_prompt(
        PromptRecord(
            criterion=criterion,
            system_prompt=system_prompt if llm.uses_system_prompt else None,
            user_prompt=user_prompt,
        )
    )


def _prompt_or_default(
    prompt: ResolvedPrompt | None, job_data: JobCreate
) -> ResolvedPrompt:
    """The given prompt, or the built-in one for the job's prompting type and target."""
    if prompt is not None:
        return prompt
    default = default_prompt_for(
        JobPromptingType(job_data.prompting_config.screening_type),
        ScreeningTarget(job_data.prompting_config.screening_target),
    )
    return ResolvedPrompt(
        prompt_name=default.name,
        system_prompt=default.system_prompt,
        user_prompt=default.user_prompt,
    )


def create_few_shot_examples(papers: list[PaperRead]):
    txt_parts = []

    for paper in papers:
        txt_parts.append(f"""Title: {paper.title}
Abstract: \"{paper.abstract}\"
Decision: {"Include" if paper.human_result == PaperHumanResult.INCLUDE else "Exclude"}
""")

    return "\n\n".join(txt_parts)


def create_criteria_list(prefix: str, criteria: list[str]) -> str:
    """One line per criterion, e.g. "- IC1: <criterion>"."""
    return "".join(f"- {prefix}{i + 1}: {c}\n" for i, c in enumerate(criteria))


def create_criteria(
    inclusion_criteria: list[str], exclusion_criteria: list[str]
) -> str:
    return (
        "\nInclusion criteria:\n\n"
        + create_criteria_list("IC", inclusion_criteria)
        + "\nExclusion criteria:\n\n"
        + create_criteria_list("EC", exclusion_criteria)
    )


async def get_structured_response(
    llm_service: LLMService,
    paper_service: PaperService,
    pdf_screening_service: PdfScreeningService,
    job_task_data: JobTask,
    job_data: JobCreate,
    inc_exc_criteria: dict,
    client: AsyncClient,
    *,
    prompt: ResolvedPrompt | None = None,
    on_prompt: PromptRecorder | None = None,
) -> StructuredResponse | JevStructuredResponse:
    prompt = _prompt_or_default(prompt, job_data)
    inclusion_criteria = inc_exc_criteria["inclusion_criteria"]
    exclusion_criteria = inc_exc_criteria["exclusion_criteria"]

    screening_target = getattr(
        job_data.prompting_config,
        "screening_target",
        "PAPER",
    )

    is_github_screening = screening_target == "GITHUB_REPOSITORY"

    api_key: SettingRead | None = None
    cfg = job_data.prompting_config
    if not isinstance(cfg, (ZeroShotPromptingConfig, FewShotPromptingConfig)):
        raise RuntimeError("Unknown prompting type.")
    llm = llm_service.get_llm(job_data.llm_config.provider_name)
    if llm.api_key_config_parameter is not None:
        api_key = await llm_service.setting_service.get_setting(
            llm.api_key_config_parameter.key,
            owner_uuid=job_data.owner_uuid,
            mask_secret=False,
        )
        if api_key is None:
            raise RuntimeError(
                f"API key {llm.api_key_config_parameter.key} for provider {job_data.llm_config.provider_name} is missing"
            )

    provider_parameters = await llm_service.resolve_provider_parameters(
        llm, job_data.llm_config.provider_parameters, job_data.owner_uuid
    )
    runtime_parameters = ProviderRuntimeParameters(
        model=job_data.llm_config.model_name,
        api_key=api_key.value if api_key is not None else "Mock",  # type: ignore
        system_prompt=prompt.system_prompt,
    )

    abstract = job_task_data.abstract
    content_label = "Abstract"
    if job_data.screening_mode == JobScreeningMode.PDF or (
        job_data.screening_mode == JobScreeningMode.AUTOMATIC
        and job_task_data.pdf_file_uuid is not None
    ):
        if job_task_data.pdf_file_uuid is None:
            raise RuntimeError("PDF file UUID is required for PDF screening mode")
        content_label = "Excerpts from the paper"
        abstract = await pdf_screening_service.get_pdf_chunks_for_screening(
            llm,
            provider_parameters,
            runtime_parameters,
            client,
            job_data.project_uuid,
            job_data.owner_uuid,
            job_task_data.pdf_file_uuid,
            inclusion_criteria,
            exclusion_criteria,
        )

    values = {
        "title": job_task_data.title,
        "abstract": abstract,
        "content_label": content_label,
        "criteria": create_criteria(inclusion_criteria, exclusion_criteria),
        "inclusion_criteria": create_criteria_list("IC", inclusion_criteria),
        "exclusion_criteria": create_criteria_list("EC", exclusion_criteria),
        "additional_instructions": (
            github_additional_instructions
            if is_github_screening
            else additional_instructions
        ),
    }
    if isinstance(cfg, FewShotPromptingConfig):
        seed_paper_uuids = list(cfg.seed_paper_inc + cfg.seed_paper_exc)
        seed_papers = await paper_service.fetch_papers_by_paper_uuids(
            seed_paper_uuids, job_data.owner_uuid
        )
        values["few_shot_examples"] = create_few_shot_examples(seed_papers)

    prompt_text = render_template(prompt.user_prompt, values)
    _record_prompt(on_prompt, llm, prompt.system_prompt, prompt_text)
    return await llm_service.call_llm(
        llm,
        provider_parameters=provider_parameters,
        model_parameters=job_data.llm_config.model_parameters,
        runtime_parameters=runtime_parameters,
        response_schema=llm.structured_response_schema,
        user_prompt=prompt_text,
        client=client,
    )


async def get_single_criterion_response(
    llm_service: LLMService,
    job_data: JobCreate,
    title: str,
    abstract: str,
    criterion_description: str,
    client: AsyncClient,
    *,
    criterion_id: str | None = None,
    prompt: ResolvedPrompt | None = None,
    on_prompt: PromptRecorder | None = None,
) -> CriterionResponse:
    prompt = _prompt_or_default(prompt, job_data)
    llm = llm_service.get_llm(job_data.llm_config.provider_name)

    api_key: SettingRead | None = None
    if llm.api_key_config_parameter is not None:
        api_key = await llm_service.setting_service.get_setting(
            llm.api_key_config_parameter.key,
            owner_uuid=job_data.owner_uuid,
            mask_secret=False,
        )
        if api_key is None:
            raise RuntimeError(
                f"API key {llm.api_key_config_parameter.key} for provider "
                f"{job_data.llm_config.provider_name} is missing"
            )
    provider_parameters = await llm_service.resolve_provider_parameters(
        llm, job_data.llm_config.provider_parameters, job_data.owner_uuid
    )
    prompt_text = render_template(
        prompt.user_prompt,
        {"title": title, "abstract": abstract, "criterion": criterion_description},
    )
    _record_prompt(
        on_prompt, llm, prompt.system_prompt, prompt_text, criterion=criterion_id
    )
    return await llm_service.call_llm(
        llm,
        provider_parameters=provider_parameters,
        model_parameters=job_data.llm_config.model_parameters,
        runtime_parameters=ProviderRuntimeParameters(
            model=job_data.llm_config.model_name,
            api_key=api_key.value if api_key is not None else "Mock",  # type: ignore
            system_prompt=prompt.system_prompt,
        ),
        response_schema=CriterionResponse,
        user_prompt=prompt_text,
        client=client,
    )
