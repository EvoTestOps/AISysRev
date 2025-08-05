from src.models.jobtask import JobTask
from src.core.llm import prompt

async def create_decision(jobtask: JobTask) -> str:
    title = jobtask.title