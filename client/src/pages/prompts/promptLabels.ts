import { JobPromptingType, ScreeningTarget } from "../../state/types";
import type { Prompt, PromptType } from "../../state/types/prompt";

export const PROMPT_TYPE_LABELS: Record<PromptType, { label: string; description: string }> = {
  [JobPromptingType.ZERO_SHOT]: {
    label: "Zero-shot",
    description: "All criteria in one call, without examples.",
  },
  [JobPromptingType.FEW_SHOT]: {
    label: "Few-shot",
    description: "All criteria in one call, with labelled seed papers as examples.",
  },
  [JobPromptingType.PER_CRITERIA]: {
    label: "Per criterion",
    description: "One call per criterion; the overall decision is computed from them.",
  },
};

export const SCREENING_TARGET_LABELS: Record<ScreeningTarget, string> = {
  [ScreeningTarget.PAPER]: "Papers",
  [ScreeningTarget.GITHUB_REPOSITORY]: "GitHub repositories",
};

const dateFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export const formatPromptDate = (date: Date) => dateFormat.format(date);

/** e.g. "My prompt · v3". */
export const promptVersionLabel = (name: string, version: number | null | undefined) =>
  version ? `${name} · v${version}` : name;

/** The built-in prompt for a type and target, from a list of prompts. */
export const findDefaultPrompt = (
  prompts: Prompt[],
  promptingType: PromptType,
  screeningTarget: ScreeningTarget,
) =>
  prompts.find(
    (p) =>
      p.is_default && p.prompting_type === promptingType && p.screening_target === screeningTarget,
  );
