"""
Classification prompt templates for multi-class and single-class classification.

Ported from AISysRevCmdLine/prompt_classify.conf
"""

MULTI_CLASS_PROMPT_TEMPLATE = """### **Role**
You are a scientist conducting a systematic review. Your task is to evaluate whether a study belongs to a specific **class** within a given **classification** and **systematic review context**.

### **Task**
Assign a **probability** that the study belongs to the specified class.

### **Assessment Type: Probability**
    - **Value:** A float between `0.000` and `1.000`
    - **Interpretation:** The likelihood, that the study belongs to a given class.
        - A value closer to `1.000` means that it is extremely likely (very strong match)
        - A value closer to `0.000` means it is extremely unlikely (very weak or no match)
        - You are encouraged to use intermediate values (e.g. `0.100`, `0.250`, `0.350`, `0.500`, `0.700`, `0.950`, `0.999` etc..), not just `0.000` or `1.000`

### **Instructions**
1. Focus **only** on whether the study belongs to the given **class** within the specified **classification** and **systematic review context**.
2. Ignore all other aspects of the study not relevant to this decision.

### **Systematic Review Context:**
  {systematic_review_context}

### **Classification:**
  {classification_name}

### **Class:**
  {class_name}

### Study:

**Title:**
\"\"\"
{title}
\"\"\"

**Abstract:**
\"\"\"
{abstract}
\"\"\"
"""


def format_classification_prompt(
    title: str,
    abstract: str,
    systematic_review_context: str,
    classification_name: str,
    class_name: str,
) -> str:
    """Format a classification prompt using the template."""
    return MULTI_CLASS_PROMPT_TEMPLATE.format(
        title=title,
        abstract=abstract,
        systematic_review_context=systematic_review_context,
        classification_name=classification_name,
        class_name=class_name,
    )
