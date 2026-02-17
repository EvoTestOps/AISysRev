export interface ClassificationDimension {
  name: string;
  classes: string[];
}

export interface ClassificationConfig {
  id: number;
  uuid: string;
  project_uuid: string;
  name: string;
  systematic_review_context: string;
  classifications: ClassificationDimension[];
  created_at: string;
  updated_at: string;
}

export interface ClassificationConfigCreate {
  project_uuid: string;
  name: string;
  systematic_review_context: string;
  classifications: ClassificationDimension[];
}

export interface CreatedClassificationConfig {
  id: number;
  uuid: string;
}
