from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, ValidationError
from src.schemas.llm import Criterion, Decision, LLMConfiguration, StructuredResponse

# A. Huotala, M. Kuutila, and M. Mäntylä, SESR-Eval: Dataset for Evaluating LLMs in the Title-Abstract Screening of Systematic Reviews (ESEM "25), September 2025

system_prompt = "You are an expert research assistant."

# Openrouter recommends instructing the LLM to respond in JSON format.
# Tested to be working with Fireworks.ai provided LLaMA 4 Maverick
json_instruct_prompt = """Output **ONLY JSON**. You should include **EVERY FIELD** defined in the schema - every field in the schema is required. Respond strictly in valid JSON format, using the following schema:

{
  "overall_decision": {
    "binary_decision": <boolean>,               // true or false
    "probability_decision": <float>,            // Value between 0.000 and 1.000
    "likert_decision": <string>,                // Integer in string format, on a Likert scale (1–7)
    "reason": <string>                          // Reason for the decision
  },
  "inclusion_criteria": [
    {
      "name": <string>,                         // Identifier for the inclusion criterion (IC1, IC2, etc.).
      "decision": {
        "binary_decision": <boolean>,
        "probability_decision": <float>,
        "likert_decision": <string>,
        "reason": <string>                      // Reason for the decision
      }
    }
    // Repeat for each inclusion criterion. All inclusion criteria should be listed here.
  ],
  "exclusion_criteria": [
    {
      "name": <string>,                         // Identifier for the exclusion criterion (EC1, EC2, etc.).
      "decision": {
        "binary_decision": <boolean>,
        "probability_decision": <float>,
        "likert_decision": <string>,
        "reason": <string>                      // Reason for the decision
      }
    }
    // Repeat for each exclusion criterion. All exclusion criteria should be listed here.
  ]
}"""

# Task prompt

prompt = """Role: You are a software engineering researcher conducting a systematic literature review (SLR).

Task: Evaluate a primary study using **three types of assessments**, applied to both:

a) The **overall** relevance of the primary study
b) Each individual **inclusion/exclusion criterion**

### Assessment Types:

1) **Binary classification**
    - **Value:** `"true"` or `"false"`
    - **Interpretation:** Whether the criterion or relevance is clearly met (true) or not (false).

2) **Probability classification**
    - **Value:** A float between `0.000` and `1.000`
    - **Interpretation:** The likelihood, that the criterion applies or the primary study is relevant.
        - A value closer to `1.000` means that it is extremely likely (very strong match)
        - A value closer to `0.000` means it is extremely unlikely (very weak or no match)
        - You are encouraged to use intermediate values (e.g. `0.100`, `0.250`, `0.350`, `0.700`, `0.950`, `0.999` etc..), not just `0.000` or `1.000`

3) **Likert scale**
    - **Value:** An integer from `1` to `7`
    - **Interpretation:** Degree of agreement with the criterion being met, or the relevance of the study
        - 1: Strongly disagree
        - 2: Disagree
        - 3: Somewhat disagree
        - 4: Neither agree nor disagree
        - 5: Somewhat agree
        - 6: Agree
        - 7: Strongly agree

### Important:
You **must provide all three types of assessments** for:
a) The overall relevance of the primary study
b) Each individual inclusion or exclusion criterion

### Inclusion and exclusion criteria:

{2}

### Additional instructions:

{3}

### Primary study:

**Title:**
\"\"\"
{0}
\"\"\"

**Abstract:**
\"\"\"
{1}
\"\"\""""

from abc import ABC, abstractmethod


class LLM(ABC):

    @abstractmethod
    def __init__(self, config: LLMConfiguration):
        pass

    @abstractmethod
    async def generate_answer_async(
        self, prompt: str
    ) -> tuple[StructuredResponse, str]:
        pass

    @property
    @abstractmethod
    def config(self) -> LLMConfiguration:
        pass


class MockLLM(LLM):
    def __init__(self, config):
        self._config = config

    async def generate_answer_async(self, prompt) -> tuple[StructuredResponse, str]:
        import json

        return (
            StructuredResponse(
                overall_decision=Decision(
                    binary_decision=False,
                    probability_decision=0.0,
                    likert_decision=1,
                    reason="Excluded",
                ),
                inclusion_criteria=[
                    Criterion(
                        name="Foo",
                        decision=Decision(
                            binary_decision=False,
                            probability_decision=0.0,
                            likert_decision=1,
                            reason="Does not match",
                        ),
                    )
                ],
                exclusion_criteria=[
                    Criterion(
                        name="Bar",
                        decision=Decision(
                            binary_decision=True,
                            probability_decision=0.8,
                            likert_decision=6,
                            reason="Matches",
                        ),
                    )
                ],
            ),
            json.dumps({"Foo": "Bar"}),
        )

    @property
    def config(self):
        raise NotImplementedError


class OpenrouterLLM(LLM):

    def __init__(self, config):
        self._config = config

    async def generate_answer_async(self, prompt) -> tuple[StructuredResponse, str]:
        import aiohttp
        from openai.lib._pydantic import to_strict_json_schema
        import json
        import logging

        logger = logging.getLogger(__name__)

        content = None
        data = None
        async with aiohttp.ClientSession() as session:
            data = {
                "model": self.config.model,
                "messages": [
                    (
                        {
                            "role": "system",
                            # "content": system_prompt + "\r\n" + json_instruct_prompt, <-- Test if JSON responses work without this
                            "content": self.config.system_prompt,
                        }
                    ),
                    {"role": "user", "content": prompt},
                ],
                "provider": {"require_parameters": True, "data_collection": "deny"},
                "max_tokens": 8193,
                "response_format": {
                    "type": "json_schema",
                    "json_schema": {
                        "name": "structured_response",
                        "strict": True,
                        "schema": to_strict_json_schema(StructuredResponse),
                    },
                },
                "temperature": self.config.temperature,
                "seed": self.config.seed,
                "top_p": self.config.top_p,
            }

            async with session.post(
                self.config.base_url,
                headers={
                    "Authorization": f"Bearer {self.config.api_key}",
                    "Content-type": "application/json",
                },
                json=data,
            ) as response:
                logger.info("Status:", response.status)
                logger.info("Content-type:", response.headers["content-type"])

                if response.status != 200:
                    text = await response.text()
                    raise Exception(
                        response.request_info,
                        response.history,
                        status=response.status,
                        message=text,
                    )

                completion = await response.json()
                data = json.dumps(completion)

                # For type-safety, validate the response JSON
                # Things might have gotten better in OpenRouter's infrastructure, so JSON is properly outputted from the OpenRouter interface.
                import re

                json_match = re.search(
                    r"json\s*(\{.*\})",
                    completion["choices"][0]["message"]["content"],
                    re.DOTALL,
                )
                json_str = (
                    # First, check if the response starts with "json"
                    json_match.group(1).strip()
                    if json_match
                    # Assume that the content is valid JSON
                    else completion["choices"][0]["message"]["content"].strip()
                )
                try:
                    content = StructuredResponse.model_validate_json(json_str)
                except ValidationError as e:
                    logger.error(e)
                    raise e
        return content, data

    @property
    def config(self) -> LLMConfiguration:
        return self._config
