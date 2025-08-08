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

export type ScreeningTask = {
  uuid: string;
  job_uuid: string;
  doi: string;
  title: string;
  abstract: string;
  status: string;
  results: unknown[] | null;
  human_result: unknown[] | null;
  status_metadata: Record<string, unknown> | null;
};

export enum JobTaskResult {
  INCLUDE = "INCLUDE",
  UNSURE = "UNSURE",
  EXCLUDE = "EXCLUDE"
}
