import json
from typing import Any, Dict, List

import tiktoken

from src.core.prompts import (
    additional_instructions,
    default_system_prompt,
    few_shot_task_prompt,
    zero_shot_task_prompt,
)
from src.schemas.llm import StructuredResponse
from src.schemas.paper import PaperRead
from src.schemas.project import Criteria
from src.schemas.token_estimation import TokenEstimation
from src.tools.llm_decision_creator import create_criteria, create_few_shot_examples

DEFAULT_ENCODING = "o200k_base"
BUFFER = 1.10


class TokenEstimationService:
    def __init__(self):
        self._encoder = tiktoken.get_encoding(DEFAULT_ENCODING)
        self._buffer = BUFFER

    def estimate_zero_shot_tokens(
        self,
        papers: List[PaperRead],
        criteria: Criteria,
        system_prompt: str = default_system_prompt,
        response_schema: Dict[str, Any] = StructuredResponse.model_json_schema(),
    ) -> TokenEstimation:

        static_tokens = self._calculate_static_tokens(system_prompt, response_schema)
        criteria_text = create_criteria(
            criteria.inclusion_criteria, criteria.exclusion_criteria
        )
        num_criteria = len(criteria.inclusion_criteria) + len(
            criteria.exclusion_criteria
        )

        total_input = 0
        for paper in papers:
            task_prompt = zero_shot_task_prompt.format(
                paper.title,
                paper.abstract,
                criteria_text,
                additional_instructions,
            )
            total_input += static_tokens + self._count_tokens(task_prompt)

        return self._build_response(len(papers), num_criteria, total_input)

    def estimate_few_shot_tokens(
        self,
        papers: List[PaperRead],
        criteria: Criteria,
        inc_seeds: List[PaperRead],
        exc_seeds: List[PaperRead],
        system_prompt: str = default_system_prompt,
        response_schema: Dict[str, Any] = StructuredResponse.model_json_schema(),
    ) -> TokenEstimation:
        static_tokens = self._calculate_static_tokens(system_prompt, response_schema)
        criteria_text = create_criteria(
            criteria.inclusion_criteria, criteria.exclusion_criteria
        )
        num_criteria = len(criteria.inclusion_criteria) + len(
            criteria.exclusion_criteria
        )
        seed_paper_text = create_few_shot_examples(inc_seeds + exc_seeds)

        total_input = 0
        for paper in papers:
            task_prompt = few_shot_task_prompt.format(
                paper.title,
                paper.abstract,
                criteria_text,
                additional_instructions,
                seed_paper_text,
            )
            total_input += static_tokens + self._count_tokens(task_prompt)

        return self._build_response(len(papers), num_criteria, total_input)

    def _build_response(self, paper_count: int, criteria_count: int, total_input: int):
        # Overhead + Overall decision + per criteria
        paper_output = 50 + 30 + (criteria_count * 15)
        total_output = paper_output * paper_count

        return TokenEstimation(
            task_count=paper_count,
            estimated_input_tokens=int(total_input * self._buffer),
            estimated_output_tokens=int(total_output * self._buffer),
            total_estimated_tokens=int((total_input + total_output) * self._buffer),
        )

    def _calculate_static_tokens(self, system_prompt: str, schema: Dict):
        schema_str = json.dumps(schema)
        static_text = f"{system_prompt}\n{schema_str}"
        return self._count_tokens(static_text)

    def _count_tokens(self, text: str) -> int:
        return len(self._encoder.encode(text)) if text else 0


def create_token_estimation_service() -> TokenEstimationService:
    return TokenEstimationService()
