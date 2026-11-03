from uuid import uuid4

import pytest
from pydantic import ValidationError

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

pytestmark = pytest.mark.unit

ZERO = JobPromptingType.ZERO_SHOT
FEW = JobPromptingType.FEW_SHOT
PER = JobPromptingType.PER_CRITERIA


# --- render_template --------------------------------------------------------


@pytest.mark.parametrize(
    "template, expected",
    [
        ("{{title}} | {{ abstract }}", "T | A"),
        # Each value is substituted once, and braces in it are left alone.
        ("{{braces}}", "{{abstract}} {0} {"),
        ("{{nope}} {title} {", "{{nope}} {title} {"),
    ],
)
def test_render_template(template, expected):
    values = {"title": "T", "abstract": "A", "braces": "{{abstract}} {0} {"}
    assert render_template(template, values) == expected


def test_find_variables_lists_each_once_in_order():
    assert find_variables("{{b}} {{a}} {{ b }}") == ["b", "a"]


# --- validate_template ------------------------------------------------------


@pytest.mark.parametrize(
    "prompting_type, system_prompt, user_prompt, expected",
    [
        (ZERO, "System", "{{title}} {{abstract}} {{criteria}}", []),
        (
            ZERO,
            "",
            "{{title}} {{abstract}} {{inclusion_criteria}} {{exclusion_criteria}}",
            [],
        ),
        (
            ZERO,
            "",
            "{{title}} {{abstract}} {{inclusion_criteria}}",
            [
                "The user prompt must contain {{criteria}}, or both "
                "{{inclusion_criteria}} and {{exclusion_criteria}}"
            ],
        ),
        (
            ZERO,
            "",
            "{{title}} {{abstract}} {{criteria}} {{bogus}} {{few_shot_examples}}",
            ["Unknown variable {{bogus}}", "Unknown variable {{few_shot_examples}}"],
        ),
        (
            FEW,
            "",
            "{{title}} {{criteria}}",
            [
                "The user prompt must contain {{abstract}}",
                "The user prompt must contain {{few_shot_examples}}",
            ],
        ),
        (PER, "", "{{title}} {{abstract}} {{criterion}}", []),
        (
            PER,
            "",
            "{{title}} {{abstract}} {{criteria}}",
            [
                "Unknown variable {{criteria}}",
                "The user prompt must contain {{criterion}}",
            ],
        ),
        (
            PER,
            "Hi {{title}}",
            "{{title}} {{abstract}} {{criterion}}",
            ["The system prompt can't contain variables; found {{title}}"],
        ),
        (
            JobPromptingType.ONE_SHOT,
            "",
            "{{title}}",
            ["Prompts can't be written for ONE_SHOT prompting"],
        ),
    ],
)
def test_validate_template(prompting_type, system_prompt, user_prompt, expected):
    assert validate_template(prompting_type, system_prompt, user_prompt) == expected


def test_every_allowed_variable_is_described():
    for allowed in ALLOWED_VARIABLES.values():
        assert allowed <= VARIABLES.keys()


# --- default prompts --------------------------------------------------------


@pytest.mark.parametrize("default", DEFAULT_PROMPTS, ids=lambda d: d.slug)
def test_every_default_prompt_is_valid_and_found_by_its_type(default):
    assert (
        validate_template(
            default.prompting_type, default.system_prompt, default.user_prompt
        )
        == []
    )
    assert (
        default_prompt_for(default.prompting_type, default.screening_target) is default
    )


def test_there_is_one_default_for_every_type_and_target():
    kinds = {(d.prompting_type, d.screening_target) for d in DEFAULT_PROMPTS}
    assert kinds == {(t, s) for t in (ZERO, FEW, PER) for s in ScreeningTarget}
    assert len({d.slug for d in DEFAULT_PROMPTS}) == len(DEFAULT_PROMPTS)


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
