from typing import List
from uuid import UUID

from pydantic import BaseModel

from src.schemas.job import JobPromptingType


class TokenEstimation(BaseModel):
    task_count: int
    estimated_input_tokens: int
    estimated_output_tokens: int
    total_estimated_tokens: int


class TokenEstimationRequest(BaseModel):
    screening_type: JobPromptingType = JobPromptingType.ZERO_SHOT
    inc_seed_uuids: List[UUID] = []
    exc_seed_uuids: List[UUID] = []
