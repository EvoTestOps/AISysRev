from src.schemas.job import JobRead
from src.models.jobtask import JobTask
from src.core.llm import prompt, LikertDecision, BinaryDecision, Decision, Criterion, StructuredResponse

def _create_criteria(inclusion_criteria: str, exclusion_criteria: str) -> str:
    ic = inclusion_criteria.split(';')
    ec = exclusion_criteria.split(';')

    criteria = "\nInclusion criteria:\n\n"
    for i, criterion in enumerate(ic):
        criteria += f"- IC{i+1}: {criterion.strip()}\n"
    criteria += "\nExclusion criteria:\n\n"
    for i, criterion in enumerate(ec):
        criteria += f"- EC{i+1}: {criterion.strip()}\n"
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

async def create_decision(jobtask: JobTask, job_data: JobRead, inclusion_criteria: str, exclusion_criteria: str) -> str:
    additional_instructions = "The paper is included, if all inclusion criteria match. If the paper matches any exclusion criteria, it is excluded."
    llm_model = job_data.llm_config.model_name

    criteria = _create_criteria(inclusion_criteria, exclusion_criteria)
    prompt_text = prompt.format(jobtask.title, jobtask.abstract, criteria, additional_instructions)
    print(prompt_text)
    res = await _llm_response()

    return res.model_dump_json()
