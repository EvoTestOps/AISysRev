# A. Huotala, M. Kuutila, and M. Mäntylä, SESR-Eval: Dataset for Evaluating LLMs in the Title-Abstract Screening of Systematic Reviews (ESEM "25), September 2025

default_system_prompt = "You are an expert research assistant."

additional_instructions = "The paper is included, if all inclusion criteria match. If the paper matches any exclusion criteria, it is excluded."

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

# Task prompts

zero_shot_task_prompt = """Role: You are a software engineering researcher conducting a systematic literature review (SLR).

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

per_criteria_task_prompt = """You are an expert research assistant conducting a systematic literature review.

TITLE: {0}
ABSTRACT: {1}

Does the following criterion apply to this paper?
Criterion: {2}

Provide a probability and a brief reason for your estimate.

- **Value:** A float between `0.000` and `1.000`
    - **Interpretation:** The likelihood that the criterion applies or the primary study is relevant.
        - A value closer to `1.000` means that it is extremely likely (very strong match)
        - A value closer to `0.000` means it is extremely unlikely (very weak or no match)
        - You are encouraged to use intermediate values (e.g. `0.100`, `0.250`, `0.350`, `0.700`, `0.950`, `0.999` etc.), not just `0.000` or `1.000`"""

few_shot_task_prompt = """Role: You are a software engineering researcher conducting a systematic literature review (SLR).

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

### Examples

Here are a few examples to aid in your decision making:

{4}

### Primary study:

**Title:**
\"\"\"
{0}
\"\"\"

**Abstract:**
\"\"\"
{1}
\"\"\""""


github_additional_instructions = (
    "Screening is for a GitHub repository, not an academic paper. "
    "The title field contains the repository name and GitHub description. "
    "The abstract field contains the README.md. "
    "The repository is included if all inclusion criteria match and none of the exclusion criteria are met. "
    "If the repository matches any exclusion criteria, it is excluded. "
    "Evaluate the exclusion criteria before the inclusion criteria. "
    "An item may satisfy every inclusion criterion and still be excluded. "
    "Do not assume features that are not mentioned in the README or description. "
    "Exclude collection repositories and text-only repositories. "
    "Absence of evidence is not enough for inclusion. "
    "Keyword being present in the README or description is not enough for inclusion. "
    "Repositories come from a broad keywoard search and may not be relevant to the research topic. "
    "Base your decision only on the provided repository title, description, README content, and criteria. "
)


github_zero_shot_task_prompt = """Role: You are a software engineering researcher conducting a systematic review of GitHub repositories.

Task: Evaluate a GitHub repository using **three types of assessments**, applied to both:

a) The **overall** relevance of the repository
b) Each individual **inclusion/exclusion criterion**

The repository information is stored using the existing paper fields:
- **Title** contains the GitHub repository name and description.
- **Abstract** contains the README.md content.

### Assessment Types:

1) **Binary classification**
    - **Value:** `"true"` or `"false"`
    - **Interpretation:** Whether the criterion or relevance is clearly met (true) or not (false).

2) **Probability classification**
    - **Value:** A float between `0.000` and `1.000`
    - **Interpretation:** The likelihood, that the criterion applies or the repository is relevant.
        - A value closer to `1.000` means that it is extremely likely (very strong match)
        - A value closer to `0.000` means it is extremely unlikely (very weak or no match)
        - You are encouraged to use intermediate values (e.g. `0.100`, `0.250`, `0.350`, `0.700`, `0.950`, `0.999` etc..), not just `0.000` or `1.000`

3) **Likert scale**
    - **Value:** An integer from `1` to `7`
    - **Interpretation:** Degree of agreement with the criterion being met, or the relevance of the repository
        - 1: Strongly disagree
        - 2: Disagree
        - 3: Somewhat disagree
        - 4: Neither agree nor disagree
        - 5: Somewhat agree
        - 6: Agree
        - 7: Strongly agree

### Important:
You **must provide all three types of assessments** for:
a) The overall relevance of the repository
b) Each individual inclusion or exclusion criterion

Base your decision only on the provided repository title, description, README content, and criteria.
Do not infer hidden functionality from the repository name alone.
README content is stronger evidence than the repository name or description alone.
If the README is missing, short, or ambiguous, reflect this uncertainty in the probability score and reason.

### Inclusion and exclusion criteria:

{2}

### Additional instructions:

{3}

### GitHub repository:

**Repository name and description:**
\"\"\"
{0}
\"\"\"

**README.md:**
\"\"\"
{1}
\"\"\""""


github_few_shot_task_prompt = """Role: You are a software engineering researcher conducting a systematic review of GitHub repositories.

Task: Evaluate a GitHub repository using **three types of assessments**, applied to both:

a) The **overall** relevance of the repository
b) Each individual **inclusion/exclusion criterion**

The repository information is stored using the existing paper fields:
- **Title** contains the GitHub repository name and description.
- **Abstract** contains the README.md content.

### Assessment Types:

1) **Binary classification**
    - **Value:** `"true"` or `"false"`
    - **Interpretation:** Whether the criterion or relevance is clearly met (true) or not (false).

2) **Probability classification**
    - **Value:** A float between `0.000` and `1.000`
    - **Interpretation:** The likelihood, that the criterion applies or the repository is relevant.
        - A value closer to `1.000` means that it is extremely likely (very strong match)
        - A value closer to `0.000` means it is extremely unlikely (very weak or no match)
        - You are encouraged to use intermediate values (e.g. `0.100`, `0.250`, `0.350`, `0.700`, `0.950`, `0.999` etc..), not just `0.000` or `1.000`

3) **Likert scale**
    - **Value:** An integer from `1` to `7`
    - **Interpretation:** Degree of agreement with the criterion being met, or the relevance of the repository
        - 1: Strongly disagree
        - 2: Disagree
        - 3: Somewhat disagree
        - 4: Neither agree nor disagree
        - 5: Somewhat agree
        - 6: Agree
        - 7: Strongly agree

### Important:
You **must provide all three types of assessments** for:
a) The overall relevance of the repository
b) Each individual inclusion or exclusion criterion

Base your decision only on the provided repository title, description, README content, examples, and criteria.
Do not infer hidden functionality from the repository name alone.
README content is stronger evidence than the repository name or description alone.
Use the examples to understand how the criteria should be applied, but do not copy their decisions blindly.

### Inclusion and exclusion criteria:

{2}

### Additional instructions:

{3}

### Examples

Here are a few labeled repository examples to aid in your decision making:

{4}

### GitHub repository:

**Repository name and description:**
\"\"\"
{0}
\"\"\"

**README.md:**
\"\"\"
{1}
\"\"\""""


github_per_criteria_task_prompt = """You are an expert research assistant conducting a systematic review of GitHub repositories.

Screening is for a GitHub repository, not an academic paper.
The title field contains the repository name and GitHub description.
The abstract field contains the README.md.


TITLE: {0}
ABSTRACT: {1}

Does the following criterion apply to this GitHub repository?
Criterion: {2}

Do not assume features that are not mentioned in the README or description.
Exclude collection repositories and text-only repositories.
Absence of evidence is not enough for inclusion.

Provide a probability and a brief reason for your estimate.

- **Value:** A float between `0.000` and `1.000`
    - **Interpretation:** The likelihood that the criterion applies or the primary study is relevant.
        - A value closer to `1.000` means that it is extremely likely (very strong match)
        - A value closer to `0.000` means it is extremely unlikely (very weak or no match)
        - You are encouraged to use intermediate values (e.g. `0.100`, `0.250`, `0.350`, `0.700`, `0.950`, `0.999` etc.), not just `0.000` or `1.000`"""
