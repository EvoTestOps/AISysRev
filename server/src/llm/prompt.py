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
