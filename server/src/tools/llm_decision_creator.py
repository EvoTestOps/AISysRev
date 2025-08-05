from src.models.jobtask import JobTask
from src.core.llm import prompt

async def create_decision(jobtask: JobTask, inclusion_criteria: str, exclusion_criteria: str) -> str:
    title = jobtask.title
    abstract = jobtask.abstract
    ic = inclusion_criteria.split(';')
    ec = exclusion_criteria.split(';')
    print("Title:", title)
    print("Abstract:", abstract)
    print("Inclusion Criteria:", ic)
    print("Exclusion Criteria:", ec)

