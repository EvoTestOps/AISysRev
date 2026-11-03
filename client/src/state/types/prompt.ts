import z from "zod";
import { JobPromptingType, ScreeningTarget } from "../types";

/** The prompting types a prompt can be written for. */
export const PROMPT_TYPES = [
  JobPromptingType.ZERO_SHOT,
  JobPromptingType.FEW_SHOT,
  JobPromptingType.PER_CRITERIA,
] as const;

export type PromptType = (typeof PROMPT_TYPES)[number];

export const PromptVersionModel = z.object({
  uuid: z.string(),
  version: z.number(),
  system_prompt: z.string(),
  user_prompt: z.string(),
  change_note: z.string().nullable().optional(),
  created_at: z.coerce.date(),
});

export type PromptVersion = z.infer<typeof PromptVersionModel>;

/** The publication a built-in prompt comes from. */
export const PromptSourceModel = z.object({
  /** Short form, e.g. "ESEM '25". */
  label: z.string(),
  citation: z.string(),
  doi: z.string(),
  /** The version whose text is the published prompt. */
  version: z.number(),
});

export type PromptSource = z.infer<typeof PromptSourceModel>;

export const PromptModel = z.object({
  uuid: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  prompting_type: z.enum(PROMPT_TYPES),
  screening_target: z.enum(ScreeningTarget),
  /** Built-in prompts are shared by every account and can't be changed. */
  is_default: z.boolean(),
  source: PromptSourceModel.nullable().optional(),
  archived: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  latest_version: PromptVersionModel,
});

export type Prompt = z.infer<typeof PromptModel>;

export const PromptDetailModel = PromptModel.extend({
  /** Newest first. */
  versions: z.array(PromptVersionModel),
});

export type PromptDetail = z.infer<typeof PromptDetailModel>;

export const PromptVariableModel = z.object({
  name: z.string(),
  label: z.string(),
  description: z.string(),
  example: z.string(),
});

export type PromptVariable = z.infer<typeof PromptVariableModel>;

export const PromptTypeVariablesModel = z.object({
  prompting_type: z.enum(JobPromptingType),
  allowed: z.array(z.string()),
  required: z.array(z.string()),
  /** Needs {{criteria}}, or both {{inclusion_criteria}} and {{exclusion_criteria}}. */
  requires_criteria: z.boolean(),
});

export type PromptTypeVariables = z.infer<typeof PromptTypeVariablesModel>;

export const PromptVariablesModel = z.object({
  variables: z.array(PromptVariableModel),
  types: z.array(PromptTypeVariablesModel),
});

export type PromptVariables = z.infer<typeof PromptVariablesModel>;

/** The text of a prompt, as saved in one version. */
export type PromptText = {
  system_prompt: string;
  user_prompt: string;
  change_note?: string | null;
};

export type PromptCreate = PromptText & {
  name: string;
  description?: string | null;
  prompting_type: PromptType;
  screening_target: ScreeningTarget;
};
