import json
from typing import Any, Dict, List

import tiktoken

from src.core.prompts import (
    additional_instructions,
    default_system_prompt,
    zero_shot_task_prompt,
)
from src.schemas.job import JobPromptingType
from src.schemas.llm import StructuredResponse
from src.schemas.paper import PaperRead
from src.schemas.project import Criteria
from src.schemas.token_estimation import TokenEstimation
from src.tools.llm_decision_creator import create_criteria

DEFAULT_ENCODING = "o200k_base"
BUFFER = 1.10


class TokenEstimationService:
    def __init__(self):
        self._encoder = tiktoken.get_encoding(DEFAULT_ENCODING)
        self._buffer = BUFFER

    def estimate_tokens(
        self,
        papers: List[PaperRead],
        criteria: Criteria,
        system_prompt: str = default_system_prompt,
        prompt_type: JobPromptingType = JobPromptingType.ZERO_SHOT,
        seed_paper_count: int | None = None,
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

        if prompt_type == JobPromptingType.FEW_SHOT:
            if seed_paper_count is None:
                raise ValueError(
                    "seed_paper_count must be provided for few-shot token estimation"
                )
            total_input += self._calculate_few_shot_overhead(papers, seed_paper_count)

        return self._build_response(len(papers), num_criteria, total_input)

    def _calculate_few_shot_overhead(
        self, papers: List[PaperRead], seed_paper_count: int
    ):
        # Calculate tokens of paper title + abstract
        # Multiply that by the amount of manually evaluated papers (worst case)
        total_paper_tokens = sum(
            self._count_tokens(paper.title) + self._count_tokens(paper.abstract)
            for paper in papers
        )
        return total_paper_tokens * seed_paper_count


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
