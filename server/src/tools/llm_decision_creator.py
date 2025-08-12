from src.schemas.job import JobRead
from src.models.jobtask import JobTask
from src.core.llm import prompt, LikertDecision, BinaryDecision, Decision, Criterion, StructuredResponse

def _create_criteria(inclusion_criteria: list[str], exclusion_criteria: list[str]) -> str:
    criteria = "\nInclusion criteria:\n\n"
    for i, criterion in enumerate(inclusion_criteria):
        criteria += f"- IC{i+1}: {criterion}\n"
    criteria += "\nExclusion criteria:\n\n"
    for i, criterion in enumerate(exclusion_criteria):
        criteria += f"- EC{i+1}: {criterion}\n"
    return criteria

async def _llm_response() -> StructuredResponse:
    decision = Decision(
        binary_decision=False,
        probability_decision=0.45,
        likert_decision=LikertDecision.somewhatDisagree,
        reason="The study meets the inclusion criteria but matches one exclusion criteria."
    )

    return StructuredResponse(
        overall_decision=decision,
        inclusion_criteria=[
            Criterion(name="IC1", decision=decision),
            Criterion(name="IC2", decision=decision)
        ],
        exclusion_criteria=[
            Criterion(name="EC1", decision=decision)
        ]
    )

async def create_decision(jobtask: JobTask, job_data: JobRead, criteria: dict) -> str:
    additional_instructions = "The paper is included, if all inclusion criteria match. If the paper matches any exclusion criteria, it is excluded."
    llm_model = job_data.llm_config.model_name

    criteria = _create_criteria(criteria['inclusion_criteria'], criteria['exclusion_criteria'])
    prompt_text = prompt.format(jobtask.title, jobtask.abstract, criteria, additional_instructions)
    res = await _llm_response()

    return res.model_dump(mode="json")
