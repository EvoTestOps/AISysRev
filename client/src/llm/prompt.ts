// Felizardo et al.

import { Criteria, DecisionType } from "./types";

// https://doi.org/10.1145/3674805.3686666
export const likert_scale_instruction = `Using a 1-7 Likert scale (1 - Strongly disagree, 2
- Disagree, 3 - Somewhat disagree, 4 - Neither agree
nor disagree, 5 - Somewhat agree, 6 - Agree, and
7 - Strongly agree) rate your agreement with the
following statement (only number):`;

export const system_prompt = `You are a helpful assistant.`;

export const system_prompt_json = (
  decisionType: DecisionType
) => `${system_prompt} Reply in JSON, using the following format: 
{
${
  decisionType === "IncludeExclude"
    ? `"include": boolean`
    : `"likert_scale: number"`
}
}`;

export function generatePrompt(
  criteria: Array<Criteria>,
  title: string,
  abstract: string,
  decisionType: DecisionType
) {
  switch (decisionType) {
    case "IncludeExclude":
      return `Your task is to include or exclude a research paper based on the inclusion criteria. You will be providen the title and the abstract of the research paper in the end of the prompt.

Inclusion criteria:
  
${[...criteria]
  .sort((a, b) => a.id - b.id)
  .map((c, i) => `${i + 1}. ${c.criteria}\r\n`)
  .join("")}

If none of the inclusion criteria applies, the paper is excluded.

Paper:

Title of research paper: "${title}"
Abstract of research paper: "${abstract}"
  `;
    case "Likert":
      return `Assume you are a software engineering researcher conducting a systematic literature review (SLR). Consider the title, abstract, and keywords of a primary study.

Title: "${title}"
Abstract: "${abstract}"
Keywords: (no keywords at the moment)

Using a 1-7 Likert scale (1 - Strongly disagree, 2
- Disagree, 3 - Somewhat disagree, 4 - Neither agree
nor disagree, 5 - Somewhat agree, 6 - Agree, and
7 - Strongly agree) rate your agreement with the
following statement (only number): ${[...criteria]
        .sort((a, b) => a.id - b.id)
        .map((c) => `${c.criteria}`)
        .join(" and ")}.`;
    default:
      throw new Error("Unknown decision type");
  }
}
