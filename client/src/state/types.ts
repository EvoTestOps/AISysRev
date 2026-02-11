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

export type PromptingConfig = ZeroShotPromptingConfig | FewShotPromptingConfig;

export type ZeroShotPromptingConfig = {
  screening_type: JobPromptingType.ZERO_SHOT;
};

export const createZeroShotPromptingConfig = (): ZeroShotPromptingConfig => ({
  screening_type: JobPromptingType.ZERO_SHOT,
});

export type FewShotPromptingConfig = {
  screening_type: JobPromptingType.FEW_SHOT;
  seed_paper_inc: string[];
  seed_paper_exc: string[];
  remember_selection: boolean;
};

export const createFewShotPromptingConfig = (
  include_seeds: string[],
  exclude_seeds: string[],
  remember_selection = true,
): FewShotPromptingConfig => ({
  screening_type: JobPromptingType.FEW_SHOT,
  seed_paper_exc: exclude_seeds,
  seed_paper_inc: include_seeds,
  remember_selection,
});

export type CreatedJob = {
  uuid: string;
  project_uuid: string;
  prompting_config: PromptingConfig;
  llm_config: LlmConfig;
  created_at: string;
  updated_at: string;
};

export enum JobPromptingType {
  ZERO_SHOT = "ZERO_SHOT",
  ONE_SHOT = "ONE_SHOT",
  FEW_SHOT = "FEW_SHOT",
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
    project_uuid: string;
    prompting_config: PromptingConfig;
    llm_config: LlmConfig;
    created_at: Date | null;
    updated_at: Date | null;
    stats: JobStats;
}

export type Paper = {
  uuid: string;
  paper_id: number;
  project_uuid: string;
  file_uuid: string;
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
  file_uuid: string;
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
