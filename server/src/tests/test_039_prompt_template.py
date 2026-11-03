from uuid import uuid4

import pytest
from fastapi import status
from pydantic import ValidationError

from src.api.controllers.prompt import _http_error
from src.core.prompt_template import (
    ALLOWED_VARIABLES,
    VARIABLES,
    find_variables,
    render_template,
    validate_template,
)
from src.core.prompts import DEFAULT_PROMPTS, default_prompt_for
from src.schemas.job import (
    JobCreate,
    JobPromptingType,
    LLMModelConfig,
    ZeroShotPromptingConfig,
)
from src.schemas.project import ScreeningTarget
from src.schemas.prompt import PromptCreateRequest
from src.services.prompt_service import PromptNotFoundError, PromptReadOnlyError

pytestmark = pytest.mark.unit

ZERO = JobPromptingType.ZERO_SHOT
FEW = JobPromptingType.FEW_SHOT
PER = JobPromptingType.PER_CRITERIA


# --- render_template --------------------------------------------------------


def test_render_substitutes_variables_with_or_without_inner_whitespace():
    assert (
        render_template("{{title}} | {{ abstract }}", {"title": "T", "abstract": "A"})
        == "T | A"
    )


def test_render_substitutes_each_value_once():
    rendered = render_template(
        "{{title}}", {"title": "{{abstract}} {0} {", "abstract": "nope"}
    )
    assert rendered == "{{abstract}} {0} {"


def test_render_leaves_unknown_variables_and_single_braces_alone():
    assert render_template("{{nope}} {title} {", {"title": "T"}) == (
        "{{nope}} {title} {"
    )


def test_find_variables_lists_each_once_in_order():
    assert find_variables("{{b}} {{a}} {{ b }}") == ["b", "a"]


# --- validate_template ------------------------------------------------------


def test_a_complete_zero_shot_prompt_is_valid():
    assert (
        validate_template(ZERO, "System", "{{title}} {{abstract}} {{criteria}}") == []
    )


def test_the_split_criteria_lists_can_replace_the_criteria_block():
    template = "{{title}} {{abstract}} {{inclusion_criteria}} {{exclusion_criteria}}"
    assert validate_template(ZERO, "", template) == []


def test_only_one_criteria_list_is_not_enough():
    errors = validate_template(
        ZERO, "", "{{title}} {{abstract}} {{inclusion_criteria}}"
    )
    assert any("{{criteria}}" in e for e in errors)


def test_missing_required_variables_are_reported():
    errors = validate_template(FEW, "", "{{title}} {{criteria}}")
    assert "The user prompt must contain {{abstract}}" in errors
    assert "The user prompt must contain {{few_shot_examples}}" in errors


def test_unknown_and_wrong_type_variables_are_reported():
    errors = validate_template(
        ZERO, "", "{{title}} {{abstract}} {{criteria}} {{bogus}} {{few_shot_examples}}"
    )
    assert errors == [
        "Unknown variable {{bogus}}",
        "Unknown variable {{few_shot_examples}}",
    ]


def test_per_criteria_prompts_need_the_criterion_and_not_the_criteria():
    assert validate_template(PER, "", "{{title}} {{abstract}} {{criterion}}") == []
    errors = validate_template(PER, "", "{{title}} {{abstract}} {{criteria}}")
    assert "Unknown variable {{criteria}}" in errors
    assert "The user prompt must contain {{criterion}}" in errors


def test_the_system_prompt_cannot_use_variables():
    errors = validate_template(
        PER, "Hi {{title}}", "{{title}} {{abstract}} {{criterion}}"
    )
    assert errors == ["The system prompt can't contain variables; found {{title}}"]


def test_prompts_cannot_be_written_for_one_shot():
    assert validate_template(JobPromptingType.ONE_SHOT, "", "{{title}}") != []


def test_every_allowed_variable_is_described():
    for allowed in ALLOWED_VARIABLES.values():
        assert allowed <= VARIABLES.keys()


# --- default prompts --------------------------------------------------------


@pytest.mark.parametrize("default", DEFAULT_PROMPTS, ids=lambda d: d.slug)
def test_every_default_prompt_is_valid(default):
    assert (
        validate_template(
            default.prompting_type, default.system_prompt, default.user_prompt
        )
        == []
    )


def test_default_prompt_slugs_are_unique():
    slugs = [d.slug for d in DEFAULT_PROMPTS]
    assert len(slugs) == len(set(slugs))


@pytest.mark.parametrize("prompting_type", [ZERO, FEW, PER])
@pytest.mark.parametrize("target", list(ScreeningTarget))
def test_there_is_a_default_for_every_type_and_target(prompting_type, target):
    default = default_prompt_for(prompting_type, target)
    assert default.prompting_type == prompting_type
    assert default.screening_target == target


def _create(**kwargs) -> PromptCreateRequest:
    return PromptCreateRequest(
        name="Mine",
        prompting_type=kwargs.pop("prompting_type", ZERO),
        system_prompt="",
        user_prompt=kwargs.pop("user_prompt", "{{title}} {{abstract}} {{criteria}}"),
    )


# --- request validation -----------------------------------------------------


def test_a_prompt_with_template_errors_is_rejected():
    with pytest.raises(ValidationError, match="Unknown variable"):
        _create(user_prompt="{{title}} {{abstract}} {{criteria}} {{bogus}}")


def test_a_prompt_cannot_be_written_for_one_shot():
    with pytest.raises(ValidationError):
        _create(prompting_type=JobPromptingType.ONE_SHOT)


def test_service_errors_map_to_http_statuses():
    assert _http_error(PromptNotFoundError("x")).status_code == 404
    assert _http_error(PromptReadOnlyError("x")).status_code == 403
    assert (
        _http_error(ValueError("x")).status_code
        == status.HTTP_422_UNPROCESSABLE_CONTENT
    )


@pytest.mark.parametrize("value", [0, 51])
def test_max_parallel_calls_is_bounded(value):
    with pytest.raises(ValidationError):
        JobCreate(
            project_uuid=uuid4(),
            owner_uuid=uuid4(),
            llm_config=LLMModelConfig(
                provider_name="mock",
                model_name="m",
                provider_parameters={},
                model_parameters={},
            ),
            prompting_config=ZeroShotPromptingConfig(),
            max_parallel_calls=value,
        )
