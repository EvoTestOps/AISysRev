export type Criteria = {
  inclusion_criteria: string[];
  exclusion_criteria: string[];
};

type FewShotPreferences = {
  inc_seed_papers: string[];
  exc_seed_papers: string[];
};

type ProjectPreferences = {
  few_shot?: FewShotPreferences;
};

export type Project = {
  uuid: string;
  name: string;
  criteria: Criteria;
  preferences: ProjectPreferences | null;
};

export type FetchedFile = {
  uuid: string;
  project_uuid: string;
  filename: string;
  mime_type: string;
  paper_count: number;
};

export type LlmConfig = {
  model_name: string;
  temperature: number;
  seed: number;
  top_p: number;
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
  remember_selection = true
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
};

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
};

// TODO: Remove result type
export type Result = {
  title: string;
  abstract: string;
  doi: string;
  human_result: string;
  [modelName: string]: string;
};
