export interface UserModel {
  name: string;
  email: string;
}

export type Project = {
  uuid: string;
  name: string;
  inclusion_criteria: string;
  exclusion_criteria: string;
};