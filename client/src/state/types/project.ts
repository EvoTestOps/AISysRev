import z from "zod";

export const CriteriaModel = z.object({
  inclusion_criteria: z.array(z.string()),
  exclusion_criteria: z.array(z.string()),
  inclusion_expression: z.string().optional().nullable(),
});

export type Criteria = z.infer<typeof CriteriaModel>;

export const FewShotPreferencesModel = z.object({
  inc_seed_papers: z.array(z.string()),
  exc_seed_papers: z.array(z.string()),
});

export type FewShotPreferences = z.infer<typeof FewShotPreferencesModel>;

export const ProjectPreferences = z.object({
  few_shot: FewShotPreferencesModel.optional(),
});

export type ProjectPreferences = z.infer<typeof ProjectPreferences>;

export const ProjectModel = z.object({
  uuid: z.string(),
  name: z.string(),
  criteria: CriteriaModel,
  preferences: ProjectPreferences.nullable(),
});

export const CreatedProjectModel = z.object({
  id: z.number(),
  uuid: z.string(),
});

export const DeletedProjectModel = z.object({
  detail: z.string(),
});

export type Project = z.infer<typeof ProjectModel>;
export type CreatedProject = z.infer<typeof CreatedProjectModel>;
export type DeletedProject = z.infer<typeof DeletedProjectModel>;
