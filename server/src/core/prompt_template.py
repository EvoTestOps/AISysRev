"""The {{variable}} template language of the screening prompts.

Templates are rendered in a single pass with a regex, never with str.format or
Jinja: a paper's title or abstract may contain braces, and a user-written
template must not be able to reach anything but the values handed to it.
"""

import re
from dataclasses import dataclass

from src.schemas.job import JobPromptingType

# {{ name }}, whitespace inside the braces allowed.
VARIABLE_RE = re.compile(r"\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}")

# The prompting types a prompt can be written for.
PROMPT_TYPES = (
    JobPromptingType.ZERO_SHOT,
    JobPromptingType.FEW_SHOT,
    JobPromptingType.PER_CRITERIA,
)


@dataclass(frozen=True)
class PromptVariable:
    name: str
    label: str
    description: str
    # Shown in the editor's preview in place of real data.
    example: str


_EXAMPLE_INCLUSION = (
    "- IC1: The study evaluates a software testing technique\n"
    "- IC2: The study reports an empirical evaluation\n"
)
_EXAMPLE_EXCLUSION = "- EC1: The study is a secondary study\n"

VARIABLES: dict[str, PromptVariable] = {
    v.name: v
    for v in [
        PromptVariable(
            "title",
            "Title",
            "The paper's title. For a GitHub repository, its name and description.",
            "Search-based test generation for microservices",
        ),
        PromptVariable(
            "abstract",
            "Abstract",
            "The paper's abstract. In PDF screening, excerpts of the full text "
            "instead; for a GitHub repository, its README.",
            "We present a search-based approach for generating API tests...",
        ),
        PromptVariable(
            "content_label",
            "Content label",
            'What {{abstract}} holds: "Abstract", or "Excerpts from the paper" '
            "in PDF screening.",
            "Abstract",
        ),
        PromptVariable(
            "criteria",
            "All criteria",
            "The inclusion criteria (IC1, IC2, ...) followed by the exclusion "
            "criteria (EC1, EC2, ...), each under its own heading.",
            f"\nInclusion criteria:\n\n{_EXAMPLE_INCLUSION}"
            f"\nExclusion criteria:\n\n{_EXAMPLE_EXCLUSION}",
        ),
        PromptVariable(
            "inclusion_criteria",
            "Inclusion criteria",
            "The project's inclusion criteria, one per line as IC1, IC2, ...",
            _EXAMPLE_INCLUSION,
        ),
        PromptVariable(
            "exclusion_criteria",
            "Exclusion criteria",
            "The project's exclusion criteria, one per line as EC1, EC2, ...",
            _EXAMPLE_EXCLUSION,
        ),
        PromptVariable(
            "additional_instructions",
            "Additional instructions",
            "Built-in decision rules for the screening target, e.g. that a paper "
            "is excluded if it matches any exclusion criterion.",
            "The paper is included, if all inclusion criteria match. If the paper "
            "matches any exclusion criteria, it is excluded.",
        ),
        PromptVariable(
            "few_shot_examples",
            "Few-shot examples",
            "The seed papers picked for the task, each with its title, abstract "
            "and the Include/Exclude decision.",
            'Title: Mutation testing at scale\nAbstract: "We study..."\n'
            "Decision: Include\n",
        ),
        PromptVariable(
            "criterion",
            "Criterion",
            "The one criterion being evaluated. Per-criteria prompts are sent "
            "once for each criterion.",
            "The study evaluates a software testing technique",
        ),
    ]
}

_STANDARD = {
    "title",
    "abstract",
    "content_label",
    "criteria",
    "inclusion_criteria",
    "exclusion_criteria",
    "additional_instructions",
}

ALLOWED_VARIABLES: dict[JobPromptingType, set[str]] = {
    JobPromptingType.ZERO_SHOT: _STANDARD,
    JobPromptingType.FEW_SHOT: _STANDARD | {"few_shot_examples"},
    JobPromptingType.PER_CRITERIA: {"title", "abstract", "criterion"},
}

REQUIRED_VARIABLES: dict[JobPromptingType, set[str]] = {
    JobPromptingType.ZERO_SHOT: {"title", "abstract"},
    JobPromptingType.FEW_SHOT: {"title", "abstract", "few_shot_examples"},
    JobPromptingType.PER_CRITERIA: {"title", "abstract", "criterion"},
}

# Prompts that judge the whole paper need the criteria, either as one block or
# as both lists.
NEEDS_CRITERIA = {JobPromptingType.ZERO_SHOT, JobPromptingType.FEW_SHOT}


def find_variables(template: str) -> list[str]:
    """The variable names a template uses, in order of first use."""
    return list(dict.fromkeys(VARIABLE_RE.findall(template)))


def validate_template(
    prompting_type: JobPromptingType, system_prompt: str, user_prompt: str
) -> list[str]:
    """Problems that would stop the prompt from working; empty when it's valid."""
    if prompting_type not in ALLOWED_VARIABLES:
        return [f"Prompts can't be written for {prompting_type.value} prompting"]

    errors: list[str] = []
    for name in find_variables(system_prompt):
        errors.append(
            f"The system prompt can't contain variables; found {{{{{name}}}}}"
        )

    used = set(find_variables(user_prompt))
    allowed = ALLOWED_VARIABLES[prompting_type]
    for name in find_variables(user_prompt):
        if name not in allowed:
            errors.append(f"Unknown variable {{{{{name}}}}}")
    for name in sorted(REQUIRED_VARIABLES[prompting_type] - used):
        errors.append(f"The user prompt must contain {{{{{name}}}}}")
    if prompting_type in NEEDS_CRITERIA and not (
        "criteria" in used or {"inclusion_criteria", "exclusion_criteria"} <= used
    ):
        errors.append(
            "The user prompt must contain {{criteria}}, or both "
            "{{inclusion_criteria}} and {{exclusion_criteria}}"
        )
    return errors


def render_template(template: str, values: dict[str, str]) -> str:
    """Substitutes each {{variable}} once; unknown variables are left as they are."""

    def substitute(match: re.Match[str]) -> str:
        value = values.get(match.group(1))
        return match.group(0) if value is None else value

    return VARIABLE_RE.sub(substitute, template)
