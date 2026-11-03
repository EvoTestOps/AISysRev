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

export const PromptModel = z.object({
  uuid: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  prompting_type: z.enum(PROMPT_TYPES),
  screening_target: z.enum(ScreeningTarget),
  /** Built-in prompts are shared by every account and can't be changed. */
  is_default: z.boolean(),
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

// Without dates, so the generated schemas parse them as they are.
export type {
  PromptCreateRequest as PromptCreate,
  PromptText,
  PromptTypeVariables,
  PromptVariableRead as PromptVariable,
  PromptVariablesResponse as PromptVariables,
} from "../../services/api/client";
