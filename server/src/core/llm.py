from enum import Enum
from pydantic import BaseModel, Field

# A. Huotala, M. Kuutila, and M. Mäntylä, SESR-Eval: Dataset for Evaluating LLMs in the Title-Abstract Screening of Systematic Reviews (ESEM "25), September 2025

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


class LikertDecision(Enum):
    stronglyDisagree = "1"
    disagree = "2"
    somewhatDisagree = "3"
    neitherAgreeOrDisagree = "4"
    somewhatAgree = "5"
    agree = "6"
    stronglyAgree = "7"


class BinaryDecision(Enum):
    include = "Include"
    exclude = "Exclude"


class Decision(BaseModel, extra="forbid"):
    binary_decision: bool = Field(
        description="Whether the criterion or relevance is clearly met (true) or not (false)."
    )
    probability_decision: float = Field(
        description="The likelihood, that the criterion applies or the primary study is relevant. A value closer to `1.0` means that it is extremely likely (very strong match). A value closer to `0.0` means it is extremely unlikely (very weak or no match). You are encouraged to use intermediate values (e.g. `0.1`, `0.2`, `0.35`, `0.7`, etc..), not just `0.0` or `1.0`"
    )
    likert_decision: LikertDecision = Field(
        description="Likert scale decision. The degree of agreement with the criterion being met, or the relevance of the study. Possible values: 1: Strongly disagree, 2: Disagree, 3: Somewhat disagree, 4: Neither agree or disagree, 5: Somewhat agree, 6: Agree, 7: Strongly agree"
    )
    reason: str = Field(description="Reason for the decision.")


class Criterion(BaseModel, extra="forbid"):
    name: str = Field(
        description="Criterion ID. E.g. IC1, IC2, IC3 etc.. for inclusion criteria or EC1, EC2, EC3 etc.. for exclusion criteria"
    )
    decision: Decision = Field(description="Decision for the criterion.")


class StructuredResponse(BaseModel, extra="forbid"):
    overall_decision: Decision
    inclusion_criteria: list[Criterion]
    exclusion_criteria: list[Criterion]
