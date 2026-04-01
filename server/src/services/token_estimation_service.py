import json
from typing import Any, Dict, List

import tiktoken
from pydantic import BaseModel

from src.core.prompts import (
    additional_instructions,
    default_system_prompt,
    zero_shot_task_prompt,
)
from src.schemas.llm import StructuredResponse
from src.schemas.paper import PaperRead
from src.schemas.project import Criteria
from src.tools.llm_decision_creator import create_criteria

DEFAULT_ENCODING = "o200k_base"


class TokenEstimation(BaseModel):
    task_count: int
    estimated_input_tokens: int
    estimated_output_tokens: int
    total_estimated_tokens: int


class TokenEstimationService:
    def __init__(self):
        self._encoder = tiktoken.get_encoding(DEFAULT_ENCODING)

    async def estimate_tokens(
        self,
        papers: List[PaperRead],
        criteria: Criteria,
        system_prompt: str = default_system_prompt,
        task_prompt_template: str = zero_shot_task_prompt,
        additional_instructions: str = additional_instructions,
        response_schema: Dict[str, Any] = StructuredResponse.model_json_schema(),
    ) -> TokenEstimation:

        schema_str = json.dumps(response_schema)
        static_text = f"{system_prompt}\n{schema_str}"
        static_tokens = self._count_tokens(static_text)

        criteria_text = create_criteria(
            criteria.inclusion_criteria, criteria.exclusion_criteria
        )
        num_criteria = len(criteria.inclusion_criteria) + len(
            criteria.exclusion_criteria
        )

        total_input = 0
        total_output = 0

        for paper in papers:
            task_prompt = task_prompt_template.format(
                paper.title,
                paper.abstract,
                criteria_text,
                additional_instructions,
            )
            paper_input = static_tokens + self._count_tokens(task_prompt)
            total_input += paper_input

            # Overhead + Overall decision + per criteria
            paper_output = 50 + 30 + (num_criteria * 15)
            total_output += paper_output

        buffer = 1.10

        return TokenEstimation(
            task_count=len(papers),
            estimated_input_tokens=int(total_input * buffer),
            estimated_output_tokens=int(total_output * buffer),
            total_estimated_tokens=int((total_input + total_output) * buffer),
        )

    def _count_tokens(self, text: str) -> int:
        if not text:
            return 0
        return len(self._encoder.encode(text))

def create_token_estimation_service() -> TokenEstimationService:
    return TokenEstimationService()
