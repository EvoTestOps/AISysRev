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