from src.models.jobtask import JobTask
from src.core.llm import prompt, LikertDecision, BinaryDecision, Decision, Criterion, StructuredResponse

async def create_decision(jobtask: JobTask, inclusion_criteria: str, exclusion_criteria: str) -> str:
    title = jobtask.title
    abstract = jobtask.abstract
    ic = inclusion_criteria.split(';')
    ec = exclusion_criteria.split(';')
    additional_instructions = "The paper is included, if all inclusion criteria match. If the paper matches any exclusion criteria, it is excluded."

    criteria = "\nInclusion criteria:\n\n"
    for i, criterion in enumerate(ic):
        criteria += f"- IC{i+1}: {criterion.strip()}\n"
    criteria += "\nExclusion criteria:\n\n"
    for i, criterion in enumerate(ec):
        criteria += f"- EC{i+1}: {criterion.strip()}\n"
    
    prompt_text = prompt.format(title, abstract, criteria, additional_instructions)

    print(prompt_text)

    
