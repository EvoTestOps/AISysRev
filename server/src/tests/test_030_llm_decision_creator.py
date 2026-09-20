from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from src.core.prompts import (
    additional_instructions,
    few_shot_task_prompt,
    github_additional_instructions,
    github_few_shot_task_prompt,
    github_per_criteria_task_prompt,
    github_zero_shot_task_prompt,
    per_criteria_task_prompt,
    zero_shot_task_prompt,
)
from src.db.models.jobtask import JobTask
from src.schemas.job import (
    FewShotPromptingConfig,
    JobCreate,
    JobScreeningMode,
    LLMModelConfig,
    PerCriteriaPromptingConfig,
    ZeroShotPromptingConfig,
)
from src.schemas.llm import CriterionResponse, StructuredResponse
from src.schemas.paper import PaperHumanResult, PaperRead
from src.schemas.project import ScreeningTarget
from src.schemas.setting import SettingRead
from src.tools.llm_decision_creator import (
    create_criteria,
    create_few_shot_examples,
    get_single_criterion_response,
    get_structured_response,
)

pytestmark = pytest.mark.unit

INCLUSION = ["Is empirical", "Is peer reviewed"]
EXCLUSION = ["Is a survey"]
CRITERIA_DICT = {"inclusion_criteria": INCLUSION, "exclusion_criteria": EXCLUSION}
CRITERIA_TEXT = create_criteria(INCLUSION, EXCLUSION)
API_KEY_NAME = "openai_api_key"


# --- helpers ----------------------------------------------------------------


def _job_data(
    prompting_config=None,
    screening_mode: JobScreeningMode = JobScreeningMode.TEXT,
) -> JobCreate:
    return JobCreate(
        project_uuid=uuid4(),
        owner_uuid=uuid4(),
        llm_config=LLMModelConfig(
            provider_name="Test provider",
            model_name="test-model",
            provider_parameters={"base_url": "http://llm"},
            model_parameters={"temperature": 0.3},
        ),
        prompting_config=prompting_config or ZeroShotPromptingConfig(),
        screening_mode=screening_mode,
    )


def _github_config():
    return ZeroShotPromptingConfig(screening_target=ScreeningTarget.GITHUB_REPOSITORY)


def _job_task(pdf_file_uuid=None) -> JobTask:
    task = MagicMock(spec=JobTask)
    task.title = "The title"
    task.abstract = "The abstract"
    task.pdf_file_uuid = pdf_file_uuid
    return task


def _llm_service(needs_api_key: bool = False, stored_key: str | None = None):
    """A fake LLMService; `call_llm` returns a sentinel we can recognise."""
    provider = SimpleNamespace(
        api_key_config_parameter=(
            SimpleNamespace(key=API_KEY_NAME) if needs_api_key else None
        )
    )
    service = MagicMock()
    service.get_llm.return_value = provider
    service.call_llm = AsyncMock(return_value=object())
    service.setting_service.get_setting = AsyncMock(
        return_value=(
            SettingRead(name=API_KEY_NAME, value=stored_key, secret=True)
            if stored_key
            else None
        )
    )
    return service, provider


def _paper(title: str, decision: PaperHumanResult | None):
    return PaperRead(
        uuid=uuid4(),
        paper_id=1,
        project_uuid=uuid4(),
        doi=None,
        title=title,
        abstract=f"Abstract of {title}",
        human_result=decision,
    )


async def _structured(
    service,
    job_data: JobCreate,
    task: JobTask | None = None,
    paper_service=None,
    pdf_service=None,
):
    client = MagicMock()
    result = await get_structured_response(
        service,
        paper_service or MagicMock(),
        pdf_service or MagicMock(),
        task or _job_task(),
        job_data,
        CRITERIA_DICT,
        client,
    )
    return result, client


# --- create_criteria --------------------------------------------------------


def test_create_criteria_numbers_each_side_separately():
    assert create_criteria(["a", "b"], ["c"]) == (
        "\nInclusion criteria:\n\n"
        "- IC1: a\n"
        "- IC2: b\n"
        "\nExclusion criteria:\n\n"
        "- EC1: c\n"
    )


def test_create_criteria_without_criteria_keeps_the_headings():
    assert create_criteria([], []) == (
        "\nInclusion criteria:\n\n\nExclusion criteria:\n\n"
    )


# --- create_few_shot_examples -----------------------------------------------


def test_few_shot_examples_show_title_abstract_and_decision():
    text = create_few_shot_examples(
        [
            _paper("Good", PaperHumanResult.INCLUDE),
            _paper("Bad", PaperHumanResult.EXCLUDE),
        ]
    )

    assert 'Title: Good\nAbstract: "Abstract of Good"\nDecision: Include' in text
    assert 'Title: Bad\nAbstract: "Abstract of Bad"\nDecision: Exclude' in text
    assert text.index("Good") < text.index("Bad")


def test_few_shot_examples_for_no_papers_is_empty():
    assert create_few_shot_examples([]) == ""


# --- get_structured_response: zero-shot -------------------------------------


@pytest.mark.asyncio
async def test_zero_shot_sends_the_paper_prompt_to_the_llm():
    service, provider = _llm_service()
    job_data = _job_data()

    result, client = await _structured(service, job_data)

    assert result is service.call_llm.return_value
    service.get_llm.assert_called_once_with("Test provider")
    service.call_llm.assert_awaited_once()
    args, kwargs = service.call_llm.await_args
    assert args == (provider,)
    assert kwargs["response_schema"] is StructuredResponse
    assert kwargs["client"] is client
    assert kwargs["provider_parameters"] == {"base_url": "http://llm"}
    assert kwargs["model_parameters"] == {"temperature": 0.3}
    assert kwargs["user_prompt"] == zero_shot_task_prompt.format(
        "The title", "The abstract", CRITERIA_TEXT, additional_instructions, "Abstract"
    )
    for part in ("The title", "The abstract", "IC1: Is empirical", "EC1: Is a survey"):
        assert part in kwargs["user_prompt"]


@pytest.mark.asyncio
async def test_provider_without_api_key_gets_a_placeholder_key():
    service, _ = _llm_service(needs_api_key=False)

    await _structured(service, _job_data())

    runtime = service.call_llm.await_args.kwargs["runtime_parameters"]
    assert runtime.model == "test-model"
    assert runtime.api_key == "Mock"
    service.setting_service.get_setting.assert_not_awaited()


@pytest.mark.asyncio
async def test_the_owners_api_key_is_looked_up_and_passed_on():
    service, _ = _llm_service(needs_api_key=True, stored_key="sk-secret")
    job_data = _job_data()

    await _structured(service, job_data)

    service.setting_service.get_setting.assert_awaited_once_with(
        API_KEY_NAME, owner_uuid=job_data.owner_uuid, mask_secret=False
    )
    runtime = service.call_llm.await_args.kwargs["runtime_parameters"]
    assert runtime.api_key == "sk-secret"


@pytest.mark.asyncio
async def test_a_missing_api_key_fails_before_calling_the_llm():
    service, _ = _llm_service(needs_api_key=True, stored_key=None)

    with pytest.raises(
        RuntimeError,
        match=f"API key {API_KEY_NAME} for provider Test provider is missing",
    ):
        await _structured(service, _job_data())

    service.call_llm.assert_not_awaited()


@pytest.mark.asyncio
async def test_github_screening_uses_the_github_prompt_and_instructions():
    service, _ = _llm_service()

    await _structured(service, _job_data(_github_config()))

    prompt = service.call_llm.await_args.kwargs["user_prompt"]
    assert prompt == github_zero_shot_task_prompt.format(
        "The title",
        "The abstract",
        CRITERIA_TEXT,
        github_additional_instructions,
        "Abstract",
    )
    assert prompt != zero_shot_task_prompt.format(
        "The title", "The abstract", CRITERIA_TEXT, additional_instructions, "Abstract"
    )


# --- get_structured_response: few-shot --------------------------------------


@pytest.mark.asyncio
async def test_few_shot_looks_up_the_seed_papers_and_includes_them():
    service, _ = _llm_service()
    include_uuid, exclude_uuid = str(uuid4()), str(uuid4())
    config = FewShotPromptingConfig(
        seed_paper_inc=[include_uuid],
        seed_paper_exc=[exclude_uuid],
        remember_selection=False,
    )
    seeds = [
        _paper("Seed in", PaperHumanResult.INCLUDE),
        _paper("Seed out", PaperHumanResult.EXCLUDE),
    ]
    paper_service = MagicMock()
    paper_service.fetch_papers_by_paper_uuids = AsyncMock(return_value=seeds)
    job_data = _job_data(config)

    await _structured(service, job_data, paper_service=paper_service)

    paper_service.fetch_papers_by_paper_uuids.assert_awaited_once_with(
        [include_uuid, exclude_uuid], job_data.owner_uuid
    )
    prompt = service.call_llm.await_args.kwargs["user_prompt"]
    assert prompt == few_shot_task_prompt.format(
        "The title",
        "The abstract",
        CRITERIA_TEXT,
        additional_instructions,
        create_few_shot_examples(seeds),
        "Abstract",
    )
    assert "Seed in" in prompt and "Seed out" in prompt


@pytest.mark.asyncio
async def test_github_few_shot_uses_the_github_few_shot_prompt():
    service, _ = _llm_service()
    config = FewShotPromptingConfig(
        screening_target=ScreeningTarget.GITHUB_REPOSITORY,
        seed_paper_inc=[],
        seed_paper_exc=[],
        remember_selection=False,
    )
    paper_service = MagicMock()
    paper_service.fetch_papers_by_paper_uuids = AsyncMock(return_value=[])

    await _structured(service, _job_data(config), paper_service=paper_service)

    prompt = service.call_llm.await_args.kwargs["user_prompt"]
    assert prompt == github_few_shot_task_prompt.format(
        "The title",
        "The abstract",
        CRITERIA_TEXT,
        github_additional_instructions,
        "",
        "Abstract",
    )


@pytest.mark.asyncio
async def test_per_criteria_config_is_not_supported_by_the_structured_response():
    service, _ = _llm_service()

    with pytest.raises(RuntimeError, match="Unknown prompting type"):
        await _structured(service, _job_data(PerCriteriaPromptingConfig()))

    service.call_llm.assert_not_awaited()


# --- get_structured_response: PDF screening ---------------------------------


def _pdf_service(excerpts: str = "Relevant excerpt from the PDF"):
    service = MagicMock()
    service.get_pdf_chunks_for_screening = AsyncMock(return_value=excerpts)
    return service


@pytest.mark.asyncio
async def test_pdf_mode_screens_excerpts_instead_of_the_abstract():
    service, provider = _llm_service()
    pdf_uuid = uuid4()
    pdf_service = _pdf_service()
    job_data = _job_data(screening_mode=JobScreeningMode.PDF)

    _, client = await _structured(
        service, job_data, _job_task(pdf_uuid), pdf_service=pdf_service
    )

    pdf_service.get_pdf_chunks_for_screening.assert_awaited_once()
    args = pdf_service.get_pdf_chunks_for_screening.await_args.args
    assert args[0] is provider
    assert args[1] == {"base_url": "http://llm"}
    assert args[2].model == "test-model"
    assert args[3] is client
    assert args[4:] == (
        job_data.project_uuid,
        job_data.owner_uuid,
        pdf_uuid,
        INCLUSION,
        EXCLUSION,
    )
    prompt = service.call_llm.await_args.kwargs["user_prompt"]
    assert prompt == zero_shot_task_prompt.format(
        "The title",
        "Relevant excerpt from the PDF",
        CRITERIA_TEXT,
        additional_instructions,
        "Excerpts from the paper",
    )
    assert "The abstract" not in prompt


@pytest.mark.asyncio
async def test_pdf_mode_without_a_pdf_is_an_error():
    service, _ = _llm_service()

    with pytest.raises(RuntimeError, match="PDF file UUID is required"):
        await _structured(
            service,
            _job_data(screening_mode=JobScreeningMode.PDF),
            _job_task(pdf_file_uuid=None),
            pdf_service=_pdf_service(),
        )

    service.call_llm.assert_not_awaited()


@pytest.mark.asyncio
async def test_automatic_mode_uses_the_pdf_when_the_paper_has_one():
    service, _ = _llm_service()
    pdf_service = _pdf_service()

    await _structured(
        service,
        _job_data(screening_mode=JobScreeningMode.AUTOMATIC),
        _job_task(uuid4()),
        pdf_service=pdf_service,
    )

    pdf_service.get_pdf_chunks_for_screening.assert_awaited_once()
    prompt = service.call_llm.await_args.kwargs["user_prompt"]
    assert "Relevant excerpt from the PDF" in prompt
    assert "Excerpts from the paper" in prompt


@pytest.mark.asyncio
async def test_automatic_mode_falls_back_to_the_abstract_without_a_pdf():
    service, _ = _llm_service()
    pdf_service = _pdf_service()

    await _structured(
        service,
        _job_data(screening_mode=JobScreeningMode.AUTOMATIC),
        _job_task(pdf_file_uuid=None),
        pdf_service=pdf_service,
    )

    pdf_service.get_pdf_chunks_for_screening.assert_not_awaited()
    prompt = service.call_llm.await_args.kwargs["user_prompt"]
    assert "The abstract" in prompt


@pytest.mark.asyncio
async def test_text_mode_ignores_an_attached_pdf():
    service, _ = _llm_service()
    pdf_service = _pdf_service()

    await _structured(
        service,
        _job_data(screening_mode=JobScreeningMode.TEXT),
        _job_task(uuid4()),
        pdf_service=pdf_service,
    )

    pdf_service.get_pdf_chunks_for_screening.assert_not_awaited()


# --- get_single_criterion_response ------------------------------------------


async def _single(service, job_data: JobCreate):
    client = MagicMock()
    result = await get_single_criterion_response(
        service, job_data, "The title", "The abstract", "Is empirical", client
    )
    return result, client


@pytest.mark.asyncio
async def test_single_criterion_sends_the_per_criteria_prompt():
    service, provider = _llm_service()

    result, client = await _single(service, _job_data(PerCriteriaPromptingConfig()))

    assert result is service.call_llm.return_value
    args, kwargs = service.call_llm.await_args
    assert args == (provider,)
    assert kwargs["response_schema"] is CriterionResponse
    assert kwargs["client"] is client
    assert kwargs["provider_parameters"] == {"base_url": "http://llm"}
    assert kwargs["model_parameters"] == {"temperature": 0.3}
    assert kwargs["runtime_parameters"].model == "test-model"
    assert kwargs["user_prompt"] == per_criteria_task_prompt.format(
        "The title", "The abstract", "Is empirical"
    )


@pytest.mark.asyncio
async def test_single_criterion_uses_the_github_prompt_for_github_screening():
    service, _ = _llm_service()
    config = PerCriteriaPromptingConfig(
        screening_target=ScreeningTarget.GITHUB_REPOSITORY
    )

    await _single(service, _job_data(config))

    prompt = service.call_llm.await_args.kwargs["user_prompt"]
    assert prompt == github_per_criteria_task_prompt.format(
        "The title", "The abstract", "Is empirical"
    )


@pytest.mark.asyncio
async def test_single_criterion_passes_the_owners_api_key():
    service, _ = _llm_service(needs_api_key=True, stored_key="sk-secret")
    job_data = _job_data(PerCriteriaPromptingConfig())

    await _single(service, job_data)

    service.setting_service.get_setting.assert_awaited_once_with(
        API_KEY_NAME, owner_uuid=job_data.owner_uuid, mask_secret=False
    )
    assert service.call_llm.await_args.kwargs["runtime_parameters"].api_key == (
        "sk-secret"
    )


@pytest.mark.asyncio
async def test_single_criterion_with_a_missing_api_key_fails_before_the_llm_call():
    service, _ = _llm_service(needs_api_key=True, stored_key=None)

    with pytest.raises(RuntimeError, match=f"API key {API_KEY_NAME} .* is missing"):
        await _single(service, _job_data(PerCriteriaPromptingConfig()))

    service.call_llm.assert_not_awaited()
