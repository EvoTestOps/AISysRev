import * as z from "zod";

export type FetchedFile = {
  uuid: string;
  project_uuid: string;
  filename: string;
  mime_type: string;
  paper_count: number;
};

export type LlmConfig = {
  provider_name: string;
  model_name: string;
  provider_parameters: Record<string, unknown>;
  model_parameters: Record<string, unknown>;
};

export type PromptingConfig =
  | ZeroShotPromptingConfig
  | FewShotPromptingConfig
  | PerCriteriaPromptingConfig;

export enum ScreeningTarget {
  PAPER = "PAPER",
  GITHUB_REPOSITORY = "GITHUB_REPOSITORY",
}

export type ZeroShotPromptingConfig = {
  screening_type: JobPromptingType.ZERO_SHOT;
  screening_target: ScreeningTarget,
};

export const createZeroShotPromptingConfig = (screeningTarget = ScreeningTarget.PAPER,): ZeroShotPromptingConfig => ({
  screening_type: JobPromptingType.ZERO_SHOT,
  screening_target: screeningTarget,
});

export type FewShotPromptingConfig = {
  screening_type: JobPromptingType.FEW_SHOT;
  screening_target: ScreeningTarget,
  seed_paper_inc: string[];
  seed_paper_exc: string[];
  remember_selection: boolean;
};

export const createFewShotPromptingConfig = (
  include_seeds: string[],
  exclude_seeds: string[],
  remember_selection = true,
  screeningTarget = ScreeningTarget.PAPER,
): FewShotPromptingConfig => ({
  screening_type: JobPromptingType.FEW_SHOT,
  screening_target: screeningTarget,
  seed_paper_exc: exclude_seeds,
  seed_paper_inc: include_seeds,
  remember_selection,
});

export type PerCriteriaPromptingConfig = {
  screening_type: JobPromptingType.PER_CRITERIA;
  screening_target: ScreeningTarget;
};

export const createPerCriteriaPromptingConfig =
  (screeningTarget = ScreeningTarget.PAPER): PerCriteriaPromptingConfig => ({
    screening_type: JobPromptingType.PER_CRITERIA,
    screening_target: screeningTarget,
  });

export type CreatedJob = {
  uuid: string;
  project_uuid: string;
  prompting_config: PromptingConfig;
  llm_config: LlmConfig;
  screening_mode: JobScreeningMode;
  created_at: string;
  updated_at: string;
};

export enum JobScreeningMode {
  TEXT = "TEXT",
  PDF = "PDF",
  AUTOMATIC = "AUTOMATIC",
}

export enum JobPromptingType {
  ZERO_SHOT = "ZERO_SHOT",
  ONE_SHOT = "ONE_SHOT",
  FEW_SHOT = "FEW_SHOT",
  PER_CRITERIA = "PER_CRITERIA",
}

export enum JobTaskHumanResult {
  INCLUDE = "INCLUDE",
  EXCLUDE = "EXCLUDE",
  UNSURE = "UNSURE",
}

export enum JobTaskStatus {
  NOT_STARTED = "NOT_STARTED",
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  DONE = "DONE",
  ERROR = "ERROR",
}

export enum JobStatus {
  NOT_STARTED = "NOT_STARTED",
  RUNNING = "RUNNING",
  PARTIAL_SUCCESS = "PARTIAL_SUCCESS",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

export type JobTask = {
  uuid: string;
  job_uuid: string;
  job_id: number;
  paper_uuid: string;
  doi: string | null;
  title: string;
  abstract: string;
  status: JobTaskStatus;
  result: Record<string, unknown> | null;
  human_result: JobTaskHumanResult | null;
  status_metadata: Record<string, unknown> | null;
  error: string | null;
};

export type JobStats = {
  total: number;
  success: number;
  failed: number;
  status: JobStatus;
};

export type JobWithStats = {
  uuid: string;
  id: string;
  project_uuid: string;
  prompting_config: PromptingConfig;
  llm_config: LlmConfig;
  screening_mode: JobScreeningMode;
  created_at: Date | null;
  updated_at: Date | null;
  stats: JobStats;
};

export type Paper = {
  uuid: string;
  paper_id: number;
  project_uuid: string;
  file_uuid: string | null;
  pdf_file_uuid: string | null;
  doi: string | null;
  title: string;
  abstract: string;
  human_result: JobTaskHumanResult | null;
  created_at: Date | null;
  updated_at: Date | null;
};

export type PaperWithModelEval = {
  uuid: string;
  paper_id: number;
  project_uuid: string;
  file_uuid: string | null;
  pdf_file_uuid: string | null;
  pdf_filename: string | null;
  doi: string | null;
  title: string;
  abstract: string;
  human_result: JobTaskHumanResult | null;
  created_at: Date | null;
  updated_at: Date | null;
  avg_probability_decision: number | null;
  error_messages: string[] | null;
};

// TODO: Remove result type
export type Result = {
  title: string;
  abstract: string;
  doi: string;
  human_result: string;
  [modelName: string]: string;
};

export type TokenEstimation = {
  estimated_input_tokens: number;
  estimated_output_tokens: number;
};

export type CriterionAgreementStats = {
  description: string;
  type: "inclusion" | "exclusion" | "unknown";
  n_papers: number;
  krippendorff_alpha: number | null;
  percent_agreement: number | null;
  gwet_ac1: number | null;
};

export type PerCriteriaStatsResponse = {
  n_raters: number;
  rater_job_uuids: string[];
  criteria: Record<string, CriterionAgreementStats>;
};

// Keep this up-to-date with server/src/core/llm_providers.py
const ConfigParameterSchema = z.object({
  key: z.string(),
  title: z.string(),
  type: z.enum(["string", "number", "boolean"]).default("string"),
  defaultValue: z
    .union([z.string(), z.number(), z.boolean()])
    .nullable()
    .optional(),
  secret: z.boolean(),
});

export const ProviderSchema = z.object({
  name: z.string(),
  title: z.string(),
  description: z.string(),
  model_parameters_json_schema: z.object({}).catchall(z.any()),
  provider_parameters_json_schema: z.object({}).catchall(z.any()).nullable(),
  config_parameters: z.array(ConfigParameterSchema),
});

export const ProviderResponse = z.array(ProviderSchema);

export type Provider = z.infer<typeof ProviderSchema>;
