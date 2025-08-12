export interface UserModel {
  name: string;
  email: string;
}

export type Criteria = {
  inclusion_criteria: string[];
  exclusion_criteria: string[];
};

export type Project = {
  uuid: string;
  name: string;
  criteria: Criteria;
};

export type FetchedFile = {
  uuid: string;
  project_uuid: string;
  filename: string;
  mime_type: string;
};

export enum JobTaskHumanResult {
  INCLUDE = "INCLUDE",
  EXCLUDE = "EXCLUDE",
  UNSURE = "UNSURE"
}

export enum JobTaskStatus {
  NOT_STARTED = "NOT_STARTED",
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  DONE = "DONE",
  ERROR = "ERROR"
}

export type ScreeningTask = {
  uuid: string;
  job_uuid: string;
  doi: string;
  title: string;
  abstract: string;
  status: JobTaskStatus;
  result: Record<string, unknown> | null;
  human_result: JobTaskHumanResult | null;
  status_metadata: Record<string, unknown> | null;
};
