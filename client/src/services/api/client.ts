// @ts-nocheck
import type * as __TypedOpenapi from "./client.types.js";

import { z } from "zod";

// <Schemas>
export type Body_attach_pdf_to_paper_api_v1_files__paper_uuid__attach_pdf_post =
  __TypedOpenapi.Schemas.Body_attach_pdf_to_paper_api_v1_files__paper_uuid__attach_pdf_post;
export const Body_attach_pdf_to_paper_api_v1_files__paper_uuid__attach_pdf_post = z.strictObject({ file: z.string() });

export type Body_import_fulltext_api_v1_files_import_fulltext_post =
  __TypedOpenapi.Schemas.Body_import_fulltext_api_v1_files_import_fulltext_post;
export const Body_import_fulltext_api_v1_files_import_fulltext_post = z.strictObject({
  project_uuid: z.uuid(),
  xml_file: z.string(),
  pdf_files: z.array(z.string()),
  pdf_relative_paths: z.array(z.string()),
});

export type ScreeningTarget = __TypedOpenapi.Schemas.ScreeningTarget;
export const ScreeningTarget = z.enum(["PAPER", "GITHUB_REPOSITORY"]);

export type Body_process_csv_api_v1_files_upload_post =
  __TypedOpenapi.Schemas.Body_process_csv_api_v1_files_upload_post;
export const Body_process_csv_api_v1_files_upload_post = z.strictObject({
  project_uuid: z.uuid(),
  files: z.array(z.string()),
  screening_target: ScreeningTarget.optional(),
});

export type Body_process_pdfs_api_v1_files_upload_pdfs_post =
  __TypedOpenapi.Schemas.Body_process_pdfs_api_v1_files_upload_pdfs_post;
export const Body_process_pdfs_api_v1_files_upload_pdfs_post = z.strictObject({
  project_uuid: z.uuid(),
  files: z.array(z.string()),
});

export type ConfigParameter = __TypedOpenapi.Schemas.ConfigParameter;
export const ConfigParameter = z.strictObject({
  key: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  type: z.enum(["string", "number", "boolean"]).default("string"),
  defaultValue: z.union([z.string(), z.number().int(), z.number(), z.boolean(), z.null()]).optional(),
  secret: z.boolean().default(true),
});

export type ConsentAccept = __TypedOpenapi.Schemas.ConsentAccept;
export const ConsentAccept = z.strictObject({
  terms: z.boolean(),
  privacy_policy: z.boolean(),
  research: z.boolean().nullable().optional(),
});

export type Criteria = __TypedOpenapi.Schemas.Criteria;
export const Criteria = z.strictObject({
  inclusion_criteria: z.array(z.string()),
  exclusion_criteria: z.array(z.string()),
  inclusion_expression: z.string().nullable().optional(),
  exclusion_expression: z.string().nullable().optional(),
});

export type LikertDecision = __TypedOpenapi.Schemas.LikertDecision;
export const LikertDecision = z.enum(["1", "2", "3", "4", "5", "6", "7"]);

export type Decision = __TypedOpenapi.Schemas.Decision;
export const Decision = z.strictObject({
  binary_decision: z.boolean(),
  probability_decision: z.number(),
  likert_decision: LikertDecision,
  reason: z.string(),
});

export type Criterion = __TypedOpenapi.Schemas.Criterion;
export const Criterion = z.strictObject({ name: z.string(), decision: Decision });

export type CriterionError = __TypedOpenapi.Schemas.CriterionError;
export const CriterionError = z.strictObject({ error: z.string() });

export type CriterionResponse = __TypedOpenapi.Schemas.CriterionResponse;
export const CriterionResponse = z.strictObject({ probability_decision: z.number(), reason: z.string() });

export type FewShotPreferences = __TypedOpenapi.Schemas.FewShotPreferences;
export const FewShotPreferences = z.strictObject({
  inc_seed_papers: z.array(z.string()),
  exc_seed_papers: z.array(z.string()),
});

export type FewShotPromptingConfig = __TypedOpenapi.Schemas.FewShotPromptingConfig;
export const FewShotPromptingConfig = z.strictObject({
  screening_type: z.literal("FEW_SHOT").optional(),
  screening_target: ScreeningTarget.optional(),
  seed_paper_inc: z.array(z.string()),
  seed_paper_exc: z.array(z.string()),
  remember_selection: z.boolean(),
});

export type FileReadWithPaperCount = __TypedOpenapi.Schemas.FileReadWithPaperCount;
export const FileReadWithPaperCount = z.strictObject({
  uuid: z.uuid(),
  project_uuid: z.uuid(),
  filename: z.string().max(255),
  mime_type: z.string().max(255),
  storage_path: z.string().nullable().optional(),
  paper_count: z.number().int(),
});

export type FulltextImportUnmatched = __TypedOpenapi.Schemas.FulltextImportUnmatched;
export const FulltextImportUnmatched = z.strictObject({ filename: z.string(), reason: z.string() });

export type FulltextImportResult = __TypedOpenapi.Schemas.FulltextImportResult;
export const FulltextImportResult = z.strictObject({
  matched_count: z.number().int(),
  unmatched: z.array(FulltextImportUnmatched),
});

export type ValidationError = __TypedOpenapi.Schemas.ValidationError;
export const ValidationError = z.strictObject({
  loc: z.array(z.union([z.string(), z.number().int()])),
  msg: z.string(),
  type: z.string(),
  input: z.unknown().optional(),
  ctx: z.record(z.string(), z.unknown()).optional(),
});

export type HTTPValidationError = __TypedOpenapi.Schemas.HTTPValidationError;
export const HTTPValidationError = z.strictObject({ detail: z.array(ValidationError) }).partial();

export type ZeroShotPromptingConfig = __TypedOpenapi.Schemas.ZeroShotPromptingConfig;
export const ZeroShotPromptingConfig = z
  .strictObject({ screening_type: z.literal("ZERO_SHOT"), screening_target: ScreeningTarget })
  .partial();

export type PerCriteriaPromptingConfig = __TypedOpenapi.Schemas.PerCriteriaPromptingConfig;
export const PerCriteriaPromptingConfig = z
  .strictObject({ screening_type: z.literal("PER_CRITERIA"), screening_target: ScreeningTarget })
  .partial();

export type LLMModelConfig = __TypedOpenapi.Schemas.LLMModelConfig;
export const LLMModelConfig = z.strictObject({
  provider_name: z.string(),
  model_name: z.string(),
  provider_parameters: z.record(z.string(), z.unknown()),
  model_parameters: z.record(z.string(), z.unknown()),
});

export type JobScreeningMode = __TypedOpenapi.Schemas.JobScreeningMode;
export const JobScreeningMode = z.enum(["TEXT", "PDF", "AUTOMATIC"]);

export type JobCreateRequest = __TypedOpenapi.Schemas.JobCreateRequest;
export const JobCreateRequest = z.strictObject({
  project_uuid: z.uuid(),
  prompting_config: z.discriminatedUnion("screening_type", [
    FewShotPromptingConfig.extend({ screening_type: z.literal("FEW_SHOT") }),
    PerCriteriaPromptingConfig.extend({ screening_type: z.literal("PER_CRITERIA") }),
    ZeroShotPromptingConfig.extend({ screening_type: z.literal("ZERO_SHOT") }),
  ]),
  llm_config: LLMModelConfig,
  screening_mode: JobScreeningMode.optional(),
});

export type JobRead = __TypedOpenapi.Schemas.JobRead;
export const JobRead = z.strictObject({
  uuid: z.uuid(),
  project_uuid: z.uuid(),
  prompting_config: z.discriminatedUnion("screening_type", [
    FewShotPromptingConfig.extend({ screening_type: z.literal("FEW_SHOT") }),
    PerCriteriaPromptingConfig.extend({ screening_type: z.literal("PER_CRITERIA") }),
    ZeroShotPromptingConfig.extend({ screening_type: z.literal("ZERO_SHOT") }),
  ]),
  llm_config: LLMModelConfig,
  screening_mode: JobScreeningMode,
  created_at: z.iso.datetime().transform((s) => {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) throw new Error("Invalid Date");
    return d;
  }),
  updated_at: z.iso.datetime().transform((s) => {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) throw new Error("Invalid Date");
    return d;
  }),
});

export type JobStatus = __TypedOpenapi.Schemas.JobStatus;
export const JobStatus = z.enum(["NOT_STARTED", "RUNNING", "PARTIAL_SUCCESS", "SUCCESS", "FAILED", "CANCELLED"]);

export type JobStats = __TypedOpenapi.Schemas.JobStats;
export const JobStats = z.strictObject({
  total: z.number().int(),
  success: z.number().int(),
  failed: z.number().int(),
  status: JobStatus,
});

export type JobReadWithStats = __TypedOpenapi.Schemas.JobReadWithStats;
export const JobReadWithStats = z.strictObject({
  uuid: z.uuid(),
  id: z.number().int(),
  project_uuid: z.uuid(),
  prompting_config: z.discriminatedUnion("screening_type", [
    FewShotPromptingConfig.extend({ screening_type: z.literal("FEW_SHOT") }),
    PerCriteriaPromptingConfig.extend({ screening_type: z.literal("PER_CRITERIA") }),
    ZeroShotPromptingConfig.extend({ screening_type: z.literal("ZERO_SHOT") }),
  ]),
  llm_config: LLMModelConfig,
  screening_mode: JobScreeningMode,
  created_at: z.iso.datetime().transform((s) => {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) throw new Error("Invalid Date");
    return d;
  }),
  updated_at: z.iso.datetime().transform((s) => {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) throw new Error("Invalid Date");
    return d;
  }),
  stats: JobStats,
});

export type JobTaskHumanResult = __TypedOpenapi.Schemas.JobTaskHumanResult;
export const JobTaskHumanResult = z.enum(["INCLUDE", "EXCLUDE", "UNSURE"]);

export type JobTaskHumanResultUpdate = __TypedOpenapi.Schemas.JobTaskHumanResultUpdate;
export const JobTaskHumanResultUpdate = z.strictObject({ human_result: JobTaskHumanResult });

export type JobTaskStatus = __TypedOpenapi.Schemas.JobTaskStatus;
export const JobTaskStatus = z.enum(["NOT_STARTED", "PENDING", "RUNNING", "DONE", "ERROR", "CANCELLED"]);

export type StructuredResponse = __TypedOpenapi.Schemas.StructuredResponse;
export const StructuredResponse = z.strictObject({
  overall_decision: Decision,
  inclusion_criteria: z.array(Criterion),
  exclusion_criteria: z.array(Criterion),
});

export type PerCriteriaResult = __TypedOpenapi.Schemas.PerCriteriaResult;
export const PerCriteriaResult = z.strictObject({
  mode: z.literal("PER_CRITERIA"),
  criterion_results: z.record(z.string(), z.union([CriterionResponse, CriterionError])),
  inclusion_probability: z.number().nullable(),
  exclusion_probability: z.number().nullable(),
  overall_probability: z.number().nullable(),
  binary_decision: z.boolean().nullable(),
});

export type JobTaskRead = __TypedOpenapi.Schemas.JobTaskRead;
export const JobTaskRead = z.strictObject({
  uuid: z.uuid(),
  job_id: z.number().int(),
  doi: z.string().nullable(),
  title: z.string(),
  abstract: z.string(),
  paper_uuid: z.uuid(),
  status: JobTaskStatus,
  result: z.union([StructuredResponse, PerCriteriaResult, z.null()]),
  human_result: JobTaskHumanResult.nullable().optional(),
  status_metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  error: z.string().nullable().optional(),
});

export type JobTaskReadWithLLMConfig = __TypedOpenapi.Schemas.JobTaskReadWithLLMConfig;
export const JobTaskReadWithLLMConfig = z.strictObject({
  uuid: z.uuid(),
  job_id: z.number().int(),
  doi: z.string().nullable(),
  title: z.string(),
  abstract: z.string(),
  paper_uuid: z.uuid(),
  status: JobTaskStatus,
  result: z.union([StructuredResponse, PerCriteriaResult, z.null()]),
  human_result: JobTaskHumanResult.nullable().optional(),
  status_metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  error: z.string().nullable().optional(),
  llm_config: LLMModelConfig,
  prompting_config: z.discriminatedUnion("screening_type", [
    FewShotPromptingConfig.extend({ screening_type: z.literal("FEW_SHOT") }),
    PerCriteriaPromptingConfig.extend({ screening_type: z.literal("PER_CRITERIA") }),
    ZeroShotPromptingConfig.extend({ screening_type: z.literal("ZERO_SHOT") }),
  ]),
  screening_mode: JobScreeningMode,
});

export type PaperHumanResult = __TypedOpenapi.Schemas.PaperHumanResult;
export const PaperHumanResult = z.enum(["INCLUDE", "EXCLUDE", "UNSURE"]);

export type PaperHumanResultUpdate = __TypedOpenapi.Schemas.PaperHumanResultUpdate;
export const PaperHumanResultUpdate = z.strictObject({ human_result: PaperHumanResult });

export type PaperRead = __TypedOpenapi.Schemas.PaperRead;
export const PaperRead = z.strictObject({
  uuid: z.uuid(),
  paper_id: z.number().int(),
  project_uuid: z.uuid(),
  file_uuid: z.uuid().nullable().optional(),
  pdf_file_uuid: z.uuid().nullable().optional(),
  doi: z.string().nullable(),
  title: z.string(),
  abstract: z.string(),
  human_result: PaperHumanResult.nullable().optional(),
  created_at: z.iso
    .datetime()
    .transform((s) => {
      const d = new Date(s);
      if (Number.isNaN(d.getTime())) throw new Error("Invalid Date");
      return d;
    })
    .nullable()
    .optional(),
  updated_at: z.iso
    .datetime()
    .transform((s) => {
      const d = new Date(s);
      if (Number.isNaN(d.getTime())) throw new Error("Invalid Date");
      return d;
    })
    .nullable()
    .optional(),
});

export type ProjectCreateRequest = __TypedOpenapi.Schemas.ProjectCreateRequest;
export const ProjectCreateRequest = z.strictObject({
  name: z.string().max(255),
  criteria: Criteria,
  screening_target: ScreeningTarget.optional(),
});

export type ProjectPreferences = __TypedOpenapi.Schemas.ProjectPreferences;
export const ProjectPreferences = z.strictObject({ few_shot: FewShotPreferences.nullable() });

export type ProjectRead = __TypedOpenapi.Schemas.ProjectRead;
export const ProjectRead = z.strictObject({
  uuid: z.uuid(),
  name: z.string().max(255),
  criteria: Criteria,
  preferences: ProjectPreferences.nullable(),
  created_at: z.iso.datetime().transform((s) => {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) throw new Error("Invalid Date");
    return d;
  }),
  updated_at: z.iso.datetime().transform((s) => {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) throw new Error("Invalid Date");
    return d;
  }),
  screening_target: ScreeningTarget.optional(),
  inclusion_criteria_embedding: z.array(z.array(z.number())).nullable().optional(),
  exclusion_criteria_embedding: z.array(z.array(z.number())).nullable().optional(),
});

export type Provider = __TypedOpenapi.Schemas.Provider;
export const Provider = z.strictObject({
  name: z.string(),
  title: z.string(),
  description: z.string(),
  provider_parameters_json_schema: z.record(z.string(), z.unknown()).nullable().optional(),
  model_parameters_json_schema: z.record(z.string(), z.unknown()),
  config_parameters: z.array(ConfigParameter),
});

export type ProviderConfigParamsResponse = __TypedOpenapi.Schemas.ProviderConfigParamsResponse;
export const ProviderConfigParamsResponse = z.strictObject({
  title: z.string(),
  description: z.string(),
  config_parameters: z.array(ConfigParameter),
});

export type ResearchConsentUpdate = __TypedOpenapi.Schemas.ResearchConsentUpdate;
export const ResearchConsentUpdate = z.strictObject({ research: z.boolean() });

export type UpsertData = __TypedOpenapi.Schemas.UpsertData;
export const UpsertData = z.strictObject({ name: z.string().max(1024), value: z.string().max(1024) });

export type UserRead = __TypedOpenapi.Schemas.UserRead;
export const UserRead = z.strictObject({
  uuid: z.uuid(),
  sub: z.string(),
  email: z.string().nullable().optional(),
  consent_anonymized_research_usage: z.boolean().nullable().optional(),
});

// </Schemas>

// <Endpoints>
export type post_Run_test_task_api_v1_run_test_task_post =
  __TypedOpenapi.Endpoints.post_Run_test_task_api_v1_run_test_task_post;
export const post_Run_test_task_api_v1_run_test_task_post = {
  method: z.literal("POST"),
  path: z.literal("/api/v1/run-test-task"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 200: z.unknown() },
};

export type get_Get_task_status_api_v1_task_status__task_id__get =
  __TypedOpenapi.Endpoints.get_Get_task_status_api_v1_task_status__task_id__get;
export const get_Get_task_status_api_v1_task_status__task_id__get = {
  method: z.literal("GET"),
  path: z.literal("/api/v1/task-status/{task_id}"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.strictObject({ task_id: z.string() }) },
  responses: { 200: z.unknown(), 422: HTTPValidationError },
};

export type get_Health_check_api_v1_health_get = __TypedOpenapi.Endpoints.get_Health_check_api_v1_health_get;
export const get_Health_check_api_v1_health_get = {
  method: z.literal("GET"),
  path: z.literal("/api/v1/health"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 200: z.unknown() },
};

export type get_List_projects_api_v1_project_get = __TypedOpenapi.Endpoints.get_List_projects_api_v1_project_get;
export const get_List_projects_api_v1_project_get = {
  method: z.literal("GET"),
  path: z.literal("/api/v1/project"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 200: z.array(ProjectRead) },
};

export type post_Create_new_project_api_v1_project_post =
  __TypedOpenapi.Endpoints.post_Create_new_project_api_v1_project_post;
export const post_Create_new_project_api_v1_project_post = {
  method: z.literal("POST"),
  path: z.literal("/api/v1/project"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { body: ProjectCreateRequest },
  responses: { 201: z.unknown(), 422: HTTPValidationError },
};

export type get_Get_project_api_v1_project__uuid__get =
  __TypedOpenapi.Endpoints.get_Get_project_api_v1_project__uuid__get;
export const get_Get_project_api_v1_project__uuid__get = {
  method: z.literal("GET"),
  path: z.literal("/api/v1/project/{uuid}"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.strictObject({ uuid: z.uuid() }) },
  responses: { 200: ProjectRead, 422: HTTPValidationError },
};

export type delete_Delete_project_api_v1_project__uuid__delete =
  __TypedOpenapi.Endpoints.delete_Delete_project_api_v1_project__uuid__delete;
export const delete_Delete_project_api_v1_project__uuid__delete = {
  method: z.literal("DELETE"),
  path: z.literal("/api/v1/project/{uuid}"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.strictObject({ uuid: z.uuid() }) },
  responses: { 200: z.unknown(), 422: HTTPValidationError },
};

export type get_List_files_api_v1_files__project_uuid__get =
  __TypedOpenapi.Endpoints.get_List_files_api_v1_files__project_uuid__get;
export const get_List_files_api_v1_files__project_uuid__get = {
  method: z.literal("GET"),
  path: z.literal("/api/v1/files/{project_uuid}"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.strictObject({ project_uuid: z.uuid() }) },
  responses: { 200: z.array(FileReadWithPaperCount), 422: HTTPValidationError },
};

export type post_Process_csv_api_v1_files_upload_post =
  __TypedOpenapi.Endpoints.post_Process_csv_api_v1_files_upload_post;
export const post_Process_csv_api_v1_files_upload_post = {
  method: z.literal("POST"),
  path: z.literal("/api/v1/files/upload"),
  requestFormat: z.literal("form-data"),
  responseFormat: z.literal("json"),
  parameters: { body: Body_process_csv_api_v1_files_upload_post },
  responses: { 200: z.record(z.string(), z.unknown()), 422: HTTPValidationError },
};

export type post_Process_pdfs_api_v1_files_upload_pdfs_post =
  __TypedOpenapi.Endpoints.post_Process_pdfs_api_v1_files_upload_pdfs_post;
export const post_Process_pdfs_api_v1_files_upload_pdfs_post = {
  method: z.literal("POST"),
  path: z.literal("/api/v1/files/upload-pdfs"),
  requestFormat: z.literal("form-data"),
  responseFormat: z.literal("json"),
  parameters: { body: Body_process_pdfs_api_v1_files_upload_pdfs_post },
  responses: { 200: z.record(z.string(), z.unknown()), 422: HTTPValidationError },
};

export type post_Attach_pdf_to_paper_api_v1_files__paper_uuid__attach_pdf_post =
  __TypedOpenapi.Endpoints.post_Attach_pdf_to_paper_api_v1_files__paper_uuid__attach_pdf_post;
export const post_Attach_pdf_to_paper_api_v1_files__paper_uuid__attach_pdf_post = {
  method: z.literal("POST"),
  path: z.literal("/api/v1/files/{paper_uuid}/attach-pdf"),
  requestFormat: z.literal("form-data"),
  responseFormat: z.literal("json"),
  parameters: {
    path: z.strictObject({ paper_uuid: z.uuid() }),
    body: Body_attach_pdf_to_paper_api_v1_files__paper_uuid__attach_pdf_post,
  },
  responses: { 200: PaperRead, 422: HTTPValidationError },
};

export type post_Import_fulltext_api_v1_files_import_fulltext_post =
  __TypedOpenapi.Endpoints.post_Import_fulltext_api_v1_files_import_fulltext_post;
export const post_Import_fulltext_api_v1_files_import_fulltext_post = {
  method: z.literal("POST"),
  path: z.literal("/api/v1/files/import-fulltext"),
  requestFormat: z.literal("form-data"),
  responseFormat: z.literal("json"),
  parameters: { body: Body_import_fulltext_api_v1_files_import_fulltext_post },
  responses: { 200: FulltextImportResult, 422: HTTPValidationError },
};

export type get_Download_file_api_v1_files__file_uuid__download_get =
  __TypedOpenapi.Endpoints.get_Download_file_api_v1_files__file_uuid__download_get;
export const get_Download_file_api_v1_files__file_uuid__download_get = {
  method: z.literal("GET"),
  path: z.literal("/api/v1/files/{file_uuid}/download"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.strictObject({ file_uuid: z.uuid() }) },
  responses: { 200: z.unknown(), 422: HTTPValidationError },
};

export type get_Get_jobs_api_v1_job_get = __TypedOpenapi.Endpoints.get_Get_jobs_api_v1_job_get;
export const get_Get_jobs_api_v1_job_get = {
  method: z.literal("GET"),
  path: z.literal("/api/v1/job"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { query: z.strictObject({ project: z.uuid().nullable() }).partial().optional() },
  responses: { 200: z.array(JobReadWithStats), 422: HTTPValidationError },
};

export type post_Create_job_api_v1_job_post = __TypedOpenapi.Endpoints.post_Create_job_api_v1_job_post;
export const post_Create_job_api_v1_job_post = {
  method: z.literal("POST"),
  path: z.literal("/api/v1/job"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { body: JobCreateRequest },
  responses: { 201: z.unknown(), 422: HTTPValidationError },
};

export type get_Get_single_job_api_v1_job__uuid__get =
  __TypedOpenapi.Endpoints.get_Get_single_job_api_v1_job__uuid__get;
export const get_Get_single_job_api_v1_job__uuid__get = {
  method: z.literal("GET"),
  path: z.literal("/api/v1/job/{uuid}"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.strictObject({ uuid: z.uuid() }) },
  responses: { 200: JobRead, 422: HTTPValidationError },
};

export type delete_Delete_job_api_v1_job__uuid__delete =
  __TypedOpenapi.Endpoints.delete_Delete_job_api_v1_job__uuid__delete;
export const delete_Delete_job_api_v1_job__uuid__delete = {
  method: z.literal("DELETE"),
  path: z.literal("/api/v1/job/{uuid}"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.strictObject({ uuid: z.uuid() }) },
  responses: { 200: z.unknown(), 422: HTTPValidationError },
};

export type post_Cancel_job_api_v1_job__uuid__cancel_post =
  __TypedOpenapi.Endpoints.post_Cancel_job_api_v1_job__uuid__cancel_post;
export const post_Cancel_job_api_v1_job__uuid__cancel_post = {
  method: z.literal("POST"),
  path: z.literal("/api/v1/job/{uuid}/cancel"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.strictObject({ uuid: z.uuid() }) },
  responses: { 200: z.unknown(), 422: HTTPValidationError },
};

export type get_Get_job_tasks_api_v1_jobtask__uuid__get =
  __TypedOpenapi.Endpoints.get_Get_job_tasks_api_v1_jobtask__uuid__get;
export const get_Get_job_tasks_api_v1_jobtask__uuid__get = {
  method: z.literal("GET"),
  path: z.literal("/api/v1/jobtask/{uuid}"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.strictObject({ uuid: z.uuid() }) },
  responses: { 200: z.array(JobTaskRead), 422: HTTPValidationError },
};

export type patch_Add_job_task_human_result_api_v1_jobtask__uuid__patch =
  __TypedOpenapi.Endpoints.patch_Add_job_task_human_result_api_v1_jobtask__uuid__patch;
export const patch_Add_job_task_human_result_api_v1_jobtask__uuid__patch = {
  method: z.literal("PATCH"),
  path: z.literal("/api/v1/jobtask/{uuid}"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.strictObject({ uuid: z.uuid() }), body: JobTaskHumanResultUpdate },
  responses: { 200: z.unknown(), 422: HTTPValidationError },
};

export type get_Get_job_tasks_by_paper_api_v1_jobtask_get =
  __TypedOpenapi.Endpoints.get_Get_job_tasks_by_paper_api_v1_jobtask_get;
export const get_Get_job_tasks_by_paper_api_v1_jobtask_get = {
  method: z.literal("GET"),
  path: z.literal("/api/v1/jobtask"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { query: z.strictObject({ paper_uuid: z.uuid() }) },
  responses: { 200: z.array(JobTaskReadWithLLMConfig), 422: HTTPValidationError },
};

export type get_Get_papers_api_v1_paper__project_uuid__get =
  __TypedOpenapi.Endpoints.get_Get_papers_api_v1_paper__project_uuid__get;
export const get_Get_papers_api_v1_paper__project_uuid__get = {
  method: z.literal("GET"),
  path: z.literal("/api/v1/paper/{project_uuid}"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.strictObject({ project_uuid: z.uuid() }) },
  responses: { 200: z.unknown(), 422: HTTPValidationError },
};

export type get_Get_project_papers_with_model_evals_api_v1_paper__project_uuid__with_model_evaluations_get =
  __TypedOpenapi.Endpoints.get_Get_project_papers_with_model_evals_api_v1_paper__project_uuid__with_model_evaluations_get;
export const get_Get_project_papers_with_model_evals_api_v1_paper__project_uuid__with_model_evaluations_get = {
  method: z.literal("GET"),
  path: z.literal("/api/v1/paper/{project_uuid}/with_model_evaluations"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.strictObject({ project_uuid: z.uuid() }) },
  responses: { 200: z.unknown(), 422: HTTPValidationError },
};

export type get_Download_missing_fulltext_ris_api_v1_paper__project_uuid__missing_fulltext_ris_get =
  __TypedOpenapi.Endpoints.get_Download_missing_fulltext_ris_api_v1_paper__project_uuid__missing_fulltext_ris_get;
export const get_Download_missing_fulltext_ris_api_v1_paper__project_uuid__missing_fulltext_ris_get = {
  method: z.literal("GET"),
  path: z.literal("/api/v1/paper/{project_uuid}/missing_fulltext_ris"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.strictObject({ project_uuid: z.uuid() }) },
  responses: { 200: z.unknown(), 422: HTTPValidationError },
};

export type patch_Add_paper_human_result_api_v1_paper__uuid__patch =
  __TypedOpenapi.Endpoints.patch_Add_paper_human_result_api_v1_paper__uuid__patch;
export const patch_Add_paper_human_result_api_v1_paper__uuid__patch = {
  method: z.literal("PATCH"),
  path: z.literal("/api/v1/paper/{uuid}"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.strictObject({ uuid: z.uuid() }), body: PaperHumanResultUpdate },
  responses: { 200: z.unknown(), 422: HTTPValidationError },
};

export type get_Get_setting_api_v1_setting_get = __TypedOpenapi.Endpoints.get_Get_setting_api_v1_setting_get;
export const get_Get_setting_api_v1_setting_get = {
  method: z.literal("GET"),
  path: z.literal("/api/v1/setting"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { query: z.strictObject({ name: z.string() }) },
  responses: { 200: z.unknown(), 422: HTTPValidationError },
};

export type delete_Delete_setting_api_v1_setting_delete =
  __TypedOpenapi.Endpoints.delete_Delete_setting_api_v1_setting_delete;
export const delete_Delete_setting_api_v1_setting_delete = {
  method: z.literal("DELETE"),
  path: z.literal("/api/v1/setting"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { query: z.strictObject({ name: z.string() }) },
  responses: { 200: z.unknown(), 422: HTTPValidationError },
};

export type post_Upsert_setting_api_v1_setting_post = __TypedOpenapi.Endpoints.post_Upsert_setting_api_v1_setting_post;
export const post_Upsert_setting_api_v1_setting_post = {
  method: z.literal("POST"),
  path: z.literal("/api/v1/setting"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { body: UpsertData },
  responses: { 201: z.unknown(), 422: HTTPValidationError },
};

export type get_Get_providers_api_v1_llm_providers_get =
  __TypedOpenapi.Endpoints.get_Get_providers_api_v1_llm_providers_get;
export const get_Get_providers_api_v1_llm_providers_get = {
  method: z.literal("GET"),
  path: z.literal("/api/v1/llm/providers"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 200: z.array(Provider) },
};

export type get_Get_provider_config_params_api_v1_llm_provider_config_params_get =
  __TypedOpenapi.Endpoints.get_Get_provider_config_params_api_v1_llm_provider_config_params_get;
export const get_Get_provider_config_params_api_v1_llm_provider_config_params_get = {
  method: z.literal("GET"),
  path: z.literal("/api/v1/llm/provider_config_params"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 200: z.record(z.string(), ProviderConfigParamsResponse) },
};

export type post_Get_available_models_api_v1_llm__provider__models_post =
  __TypedOpenapi.Endpoints.post_Get_available_models_api_v1_llm__provider__models_post;
export const post_Get_available_models_api_v1_llm__provider__models_post = {
  method: z.literal("POST"),
  path: z.literal("/api/v1/llm/{provider}/models"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { path: z.strictObject({ provider: z.string() }), body: z.record(z.string(), z.unknown()).nullable() },
  responses: { 200: z.unknown(), 422: HTTPValidationError },
};

export type get_Download_result_csv_api_v1_result_download_result_csv_get =
  __TypedOpenapi.Endpoints.get_Download_result_csv_api_v1_result_download_result_csv_get;
export const get_Download_result_csv_api_v1_result_download_result_csv_get = {
  method: z.literal("GET"),
  path: z.literal("/api/v1/result/download_result_csv"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { query: z.strictObject({ project_uuid: z.uuid(), screening_target: ScreeningTarget }) },
  responses: { 200: z.unknown(), 422: HTTPValidationError },
};

export type get_Download_result_html_api_v1_result_html_get =
  __TypedOpenapi.Endpoints.get_Download_result_html_api_v1_result_html_get;
export const get_Download_result_html_api_v1_result_html_get = {
  method: z.literal("GET"),
  path: z.literal("/api/v1/result/html"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { query: z.strictObject({ project_uuid: z.uuid(), screening_target: ScreeningTarget }) },
  responses: { 200: z.unknown(), 422: HTTPValidationError },
};

export type get_Get_per_criteria_stats_api_v1_result_per_criteria_stats_get =
  __TypedOpenapi.Endpoints.get_Get_per_criteria_stats_api_v1_result_per_criteria_stats_get;
export const get_Get_per_criteria_stats_api_v1_result_per_criteria_stats_get = {
  method: z.literal("GET"),
  path: z.literal("/api/v1/result/per_criteria_stats"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { query: z.strictObject({ project_uuid: z.uuid() }) },
  responses: { 200: z.unknown(), 422: HTTPValidationError },
};

export type get_Get_result_api_v1_result__get = __TypedOpenapi.Endpoints.get_Get_result_api_v1_result__get;
export const get_Get_result_api_v1_result__get = {
  method: z.literal("GET"),
  path: z.literal("/api/v1/result/"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { query: z.strictObject({ project_uuid: z.uuid() }) },
  responses: { 200: z.unknown(), 422: HTTPValidationError },
};

export type get_Event_bus_api_v1_event_queue_get = __TypedOpenapi.Endpoints.get_Event_bus_api_v1_event_queue_get;
export const get_Event_bus_api_v1_event_queue_get = {
  method: z.literal("GET"),
  path: z.literal("/api/v1/event-queue"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 200: z.unknown() },
};

export type get_Login_api_v1_auth_login_get = __TypedOpenapi.Endpoints.get_Login_api_v1_auth_login_get;
export const get_Login_api_v1_auth_login_get = {
  method: z.literal("GET"),
  path: z.literal("/api/v1/auth/login"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 200: z.unknown() },
};

export type get_Callback_api_v1_auth_callback_get = __TypedOpenapi.Endpoints.get_Callback_api_v1_auth_callback_get;
export const get_Callback_api_v1_auth_callback_get = {
  method: z.literal("GET"),
  path: z.literal("/api/v1/auth/callback"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 200: z.unknown() },
};

export type post_Accept_consent_api_v1_auth_consent_post =
  __TypedOpenapi.Endpoints.post_Accept_consent_api_v1_auth_consent_post;
export const post_Accept_consent_api_v1_auth_consent_post = {
  method: z.literal("POST"),
  path: z.literal("/api/v1/auth/consent"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { body: ConsentAccept },
  responses: { 201: UserRead, 422: HTTPValidationError },
};

export type get_Dev_login_api_v1_auth_dev_login_get = __TypedOpenapi.Endpoints.get_Dev_login_api_v1_auth_dev_login_get;
export const get_Dev_login_api_v1_auth_dev_login_get = {
  method: z.literal("GET"),
  path: z.literal("/api/v1/auth/dev-login"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { query: z.strictObject({ worker: z.string().nullable() }).partial().optional() },
  responses: { 200: z.unknown(), 422: HTTPValidationError },
};

export type get_Me_api_v1_auth_me_get = __TypedOpenapi.Endpoints.get_Me_api_v1_auth_me_get;
export const get_Me_api_v1_auth_me_get = {
  method: z.literal("GET"),
  path: z.literal("/api/v1/auth/me"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 200: UserRead },
};

export type delete_Delete_account_api_v1_auth_me_delete =
  __TypedOpenapi.Endpoints.delete_Delete_account_api_v1_auth_me_delete;
export const delete_Delete_account_api_v1_auth_me_delete = {
  method: z.literal("DELETE"),
  path: z.literal("/api/v1/auth/me"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 200: z.unknown() },
};

export type patch_Update_research_consent_api_v1_auth_me_research_consent_patch =
  __TypedOpenapi.Endpoints.patch_Update_research_consent_api_v1_auth_me_research_consent_patch;
export const patch_Update_research_consent_api_v1_auth_me_research_consent_patch = {
  method: z.literal("PATCH"),
  path: z.literal("/api/v1/auth/me/research-consent"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: { body: ResearchConsentUpdate },
  responses: { 200: UserRead, 422: HTTPValidationError },
};

export type get_Logout_api_v1_auth_logout_get = __TypedOpenapi.Endpoints.get_Logout_api_v1_auth_logout_get;
export const get_Logout_api_v1_auth_logout_get = {
  method: z.literal("GET"),
  path: z.literal("/api/v1/auth/logout"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 200: z.unknown() },
};

export type get_Privacy_policy_page_register_and_privacy_policy_get =
  __TypedOpenapi.Endpoints.get_Privacy_policy_page_register_and_privacy_policy_get;
export const get_Privacy_policy_page_register_and_privacy_policy_get = {
  method: z.literal("GET"),
  path: z.literal("/register-and-privacy-policy"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 200: z.unknown() },
};

export type get_Terms_and_conditions_page_terms_and_conditions_get =
  __TypedOpenapi.Endpoints.get_Terms_and_conditions_page_terms_and_conditions_get;
export const get_Terms_and_conditions_page_terms_and_conditions_get = {
  method: z.literal("GET"),
  path: z.literal("/terms-and-conditions"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 200: z.unknown() },
};

export type get_Login_page_login_get = __TypedOpenapi.Endpoints.get_Login_page_login_get;
export const get_Login_page_login_get = {
  method: z.literal("GET"),
  path: z.literal("/login"),
  requestFormat: z.literal("json"),
  responseFormat: z.literal("json"),
  parameters: z.never(),
  responses: { 200: z.string() },
};

// </Endpoints>

// <EndpointByMethod>
export const EndpointByMethod = {
  post: {
    "/api/v1/run-test-task": post_Run_test_task_api_v1_run_test_task_post,
    "/api/v1/project": post_Create_new_project_api_v1_project_post,
    "/api/v1/files/upload": post_Process_csv_api_v1_files_upload_post,
    "/api/v1/files/upload-pdfs": post_Process_pdfs_api_v1_files_upload_pdfs_post,
    "/api/v1/files/{paper_uuid}/attach-pdf": post_Attach_pdf_to_paper_api_v1_files__paper_uuid__attach_pdf_post,
    "/api/v1/files/import-fulltext": post_Import_fulltext_api_v1_files_import_fulltext_post,
    "/api/v1/job": post_Create_job_api_v1_job_post,
    "/api/v1/job/{uuid}/cancel": post_Cancel_job_api_v1_job__uuid__cancel_post,
    "/api/v1/setting": post_Upsert_setting_api_v1_setting_post,
    "/api/v1/llm/{provider}/models": post_Get_available_models_api_v1_llm__provider__models_post,
    "/api/v1/auth/consent": post_Accept_consent_api_v1_auth_consent_post,
  },
  get: {
    "/api/v1/task-status/{task_id}": get_Get_task_status_api_v1_task_status__task_id__get,
    "/api/v1/health": get_Health_check_api_v1_health_get,
    "/api/v1/project": get_List_projects_api_v1_project_get,
    "/api/v1/project/{uuid}": get_Get_project_api_v1_project__uuid__get,
    "/api/v1/files/{project_uuid}": get_List_files_api_v1_files__project_uuid__get,
    "/api/v1/files/{file_uuid}/download": get_Download_file_api_v1_files__file_uuid__download_get,
    "/api/v1/job": get_Get_jobs_api_v1_job_get,
    "/api/v1/job/{uuid}": get_Get_single_job_api_v1_job__uuid__get,
    "/api/v1/jobtask/{uuid}": get_Get_job_tasks_api_v1_jobtask__uuid__get,
    "/api/v1/jobtask": get_Get_job_tasks_by_paper_api_v1_jobtask_get,
    "/api/v1/paper/{project_uuid}": get_Get_papers_api_v1_paper__project_uuid__get,
    "/api/v1/paper/{project_uuid}/with_model_evaluations":
      get_Get_project_papers_with_model_evals_api_v1_paper__project_uuid__with_model_evaluations_get,
    "/api/v1/paper/{project_uuid}/missing_fulltext_ris":
      get_Download_missing_fulltext_ris_api_v1_paper__project_uuid__missing_fulltext_ris_get,
    "/api/v1/setting": get_Get_setting_api_v1_setting_get,
    "/api/v1/llm/providers": get_Get_providers_api_v1_llm_providers_get,
    "/api/v1/llm/provider_config_params": get_Get_provider_config_params_api_v1_llm_provider_config_params_get,
    "/api/v1/result/download_result_csv": get_Download_result_csv_api_v1_result_download_result_csv_get,
    "/api/v1/result/html": get_Download_result_html_api_v1_result_html_get,
    "/api/v1/result/per_criteria_stats": get_Get_per_criteria_stats_api_v1_result_per_criteria_stats_get,
    "/api/v1/result/": get_Get_result_api_v1_result__get,
    "/api/v1/event-queue": get_Event_bus_api_v1_event_queue_get,
    "/api/v1/auth/login": get_Login_api_v1_auth_login_get,
    "/api/v1/auth/callback": get_Callback_api_v1_auth_callback_get,
    "/api/v1/auth/dev-login": get_Dev_login_api_v1_auth_dev_login_get,
    "/api/v1/auth/me": get_Me_api_v1_auth_me_get,
    "/api/v1/auth/logout": get_Logout_api_v1_auth_logout_get,
    "/register-and-privacy-policy": get_Privacy_policy_page_register_and_privacy_policy_get,
    "/terms-and-conditions": get_Terms_and_conditions_page_terms_and_conditions_get,
    "/login": get_Login_page_login_get,
  },
  delete: {
    "/api/v1/project/{uuid}": delete_Delete_project_api_v1_project__uuid__delete,
    "/api/v1/job/{uuid}": delete_Delete_job_api_v1_job__uuid__delete,
    "/api/v1/setting": delete_Delete_setting_api_v1_setting_delete,
    "/api/v1/auth/me": delete_Delete_account_api_v1_auth_me_delete,
  },
  patch: {
    "/api/v1/jobtask/{uuid}": patch_Add_job_task_human_result_api_v1_jobtask__uuid__patch,
    "/api/v1/paper/{uuid}": patch_Add_paper_human_result_api_v1_paper__uuid__patch,
    "/api/v1/auth/me/research-consent": patch_Update_research_consent_api_v1_auth_me_research_consent_patch,
  },
} satisfies {
  [M in keyof __TypedOpenapi.EndpointByMethod]: { [P in keyof __TypedOpenapi.EndpointByMethod[M]]: unknown };
};
export type EndpointByMethod = __TypedOpenapi.EndpointByMethod;
// </EndpointByMethod>

// <EndpointByMethod.Shorthands>
export type PostEndpoints = EndpointByMethod["post"];
export type GetEndpoints = EndpointByMethod["get"];
export type DeleteEndpoints = EndpointByMethod["delete"];
export type PatchEndpoints = EndpointByMethod["patch"];
// </EndpointByMethod.Shorthands>

// <ApiClientTypes>
export type EndpointParameters = {
  body?: unknown;
  query?: unknown;
  header?: unknown;
  path?: unknown;
  cookie?: unknown;
};

export type MutationMethod = "post" | "put" | "patch" | "delete";
export type Method = "get" | "head" | "options" | "trace" | MutationMethod;

export type RequestFormat = "json" | "form-data" | "form-url" | "binary" | "text";
export type ResponseFormat = "json" | "sse";
export type SecurityRequirements = readonly (readonly string[])[];

// <EndpointRequestFormats>
/** Non-json request body encodings; missing entries default to `"json"`. */
export const endpointRequestFormats = {
  post: {
    "/api/v1/files/upload": "form-data",
    "/api/v1/files/upload-pdfs": "form-data",
    "/api/v1/files/{paper_uuid}/attach-pdf": "form-data",
    "/api/v1/files/import-fulltext": "form-data",
  },
} as Partial<{ [M in keyof EndpointByMethod]: Partial<{ [P in keyof EndpointByMethod[M]]: RequestFormat }> }>;
// </EndpointRequestFormats>

// <EndpointParameterStyles>
export type ParameterSerialization = { style: string; explode: boolean; allowReserved: boolean };
export type EndpointParameterStyles = Partial<
  Record<"query" | "path" | "header" | "cookie", Record<string, ParameterSerialization>>
>;
/** OpenAPI parameter styles used by the built-in encoders. */
export const endpointParameterStyles = {
  get: {
    "/api/v1/task-status/{task_id}": { path: { task_id: { style: "simple", explode: false, allowReserved: false } } },
    "/api/v1/project/{uuid}": { path: { uuid: { style: "simple", explode: false, allowReserved: false } } },
    "/api/v1/files/{project_uuid}": {
      path: { project_uuid: { style: "simple", explode: false, allowReserved: false } },
    },
    "/api/v1/files/{file_uuid}/download": {
      path: { file_uuid: { style: "simple", explode: false, allowReserved: false } },
    },
    "/api/v1/job": { query: { project: { style: "form", explode: true, allowReserved: false } } },
    "/api/v1/job/{uuid}": { path: { uuid: { style: "simple", explode: false, allowReserved: false } } },
    "/api/v1/jobtask/{uuid}": { path: { uuid: { style: "simple", explode: false, allowReserved: false } } },
    "/api/v1/jobtask": { query: { paper_uuid: { style: "form", explode: true, allowReserved: false } } },
    "/api/v1/paper/{project_uuid}": {
      path: { project_uuid: { style: "simple", explode: false, allowReserved: false } },
    },
    "/api/v1/paper/{project_uuid}/with_model_evaluations": {
      path: { project_uuid: { style: "simple", explode: false, allowReserved: false } },
    },
    "/api/v1/paper/{project_uuid}/missing_fulltext_ris": {
      path: { project_uuid: { style: "simple", explode: false, allowReserved: false } },
    },
    "/api/v1/setting": { query: { name: { style: "form", explode: true, allowReserved: false } } },
    "/api/v1/result/download_result_csv": {
      query: {
        project_uuid: { style: "form", explode: true, allowReserved: false },
        screening_target: { style: "form", explode: true, allowReserved: false },
      },
    },
    "/api/v1/result/html": {
      query: {
        project_uuid: { style: "form", explode: true, allowReserved: false },
        screening_target: { style: "form", explode: true, allowReserved: false },
      },
    },
    "/api/v1/result/per_criteria_stats": {
      query: { project_uuid: { style: "form", explode: true, allowReserved: false } },
    },
    "/api/v1/result/": { query: { project_uuid: { style: "form", explode: true, allowReserved: false } } },
    "/api/v1/auth/dev-login": { query: { worker: { style: "form", explode: true, allowReserved: false } } },
  },
  delete: {
    "/api/v1/project/{uuid}": { path: { uuid: { style: "simple", explode: false, allowReserved: false } } },
    "/api/v1/job/{uuid}": { path: { uuid: { style: "simple", explode: false, allowReserved: false } } },
    "/api/v1/setting": { query: { name: { style: "form", explode: true, allowReserved: false } } },
  },
  post: {
    "/api/v1/files/{paper_uuid}/attach-pdf": {
      path: { paper_uuid: { style: "simple", explode: false, allowReserved: false } },
    },
    "/api/v1/job/{uuid}/cancel": { path: { uuid: { style: "simple", explode: false, allowReserved: false } } },
    "/api/v1/llm/{provider}/models": { path: { provider: { style: "simple", explode: false, allowReserved: false } } },
  },
  patch: {
    "/api/v1/jobtask/{uuid}": { path: { uuid: { style: "simple", explode: false, allowReserved: false } } },
    "/api/v1/paper/{uuid}": { path: { uuid: { style: "simple", explode: false, allowReserved: false } } },
  },
} as Partial<Record<string, Partial<Record<string, EndpointParameterStyles>>>>;
// </EndpointParameterStyles>

// <EndpointResponseFormats>
/** Non-json response body modes; missing entries default to `"json"`. SSE skips JSON parse + output validation. */
export const endpointResponseFormats = {} as Partial<{
  [M in keyof EndpointByMethod]: Partial<{ [P in keyof EndpointByMethod[M]]: ResponseFormat }>;
}>;
// </EndpointResponseFormats>

// <EndpointSecurityRequirements>
/** OpenAPI security requirements applied when an endpoint has no explicit entry. */
export const defaultSecurityRequirements = [] as SecurityRequirements;
/** Endpoint-specific security requirements that differ from the default. */
export const endpointSecurityRequirements = {} as Partial<{
  [M in keyof EndpointByMethod]: Partial<{ [P in keyof EndpointByMethod[M]]: SecurityRequirements }>;
}>;
// </EndpointSecurityRequirements>

export type DefaultEndpoint = {
  parameters?: EndpointParameters | undefined;
  responses?: Record<string, unknown>;
  responseHeaders?: Record<string, unknown>;
};

export type Endpoint<TConfig extends DefaultEndpoint = DefaultEndpoint> = {
  operationId: string;
  method: Method;
  path: string;
  requestFormat: RequestFormat;
  responseFormat: ResponseFormat;
  parameters?: TConfig["parameters"];
  meta: {
    alias: string;
    hasParameters: boolean;
    areParametersRequired: boolean;
  };
  responses?: TConfig["responses"];
  responseHeaders?: TConfig["responseHeaders"];
};

/**
 * Minimal response surface used by ApiClient — avoids depending on the DOM `Response`
 * global (helpful for Node without DOM lib). Structural typing accepts fetch Response.
 */
export interface FetcherResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: {
    get(name: string): string | null;
    getSetCookie?: () => string[];
  };
  /** Present on fetch Response; used for SSE / streaming bodies. */
  body?: ReadableStream<Uint8Array> | null;
  json(): Promise<unknown>;
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
  clone(): FetcherResponse;
}

export interface Fetcher {
  decodePathParams?: (path: string, pathParams: unknown, styles?: Record<string, ParameterSerialization>) => string;
  encodeSearchParams?: (
    searchParams: unknown,
    styles?: Record<string, ParameterSerialization>,
  ) => URLSearchParams | undefined;
  /** Merge cookie params into request headers (default: Cookie header). */
  encodeCookies?: (cookies: unknown, headers: Headers) => void;
  //
  fetch: (input: {
    method: Method;
    url: URL;
    urlSearchParams?: URLSearchParams | undefined;
    parameters?: EndpointParameters | undefined;
    path: string;
    /** How to encode `parameters.body` (from OpenAPI requestBody content type). */
    requestFormat: RequestFormat;
    /** OpenAPI parameter serialization metadata for the current endpoint. */
    parameterStyles?: EndpointParameterStyles;
    /** OpenAPI security requirements for this operation. Empty means no credentials are required. */
    security?: SecurityRequirements;
    overrides?: RequestInit;
    throwOnStatusError?: boolean;
  }) => Promise<FetcherResponse>;
  parseResponseData?: (response: FetcherResponse) => Promise<unknown>;
}

export const successStatusCodes = [
  200, 201, 202, 203, 204, 205, 206, 207, 208, 226, 300, 301, 302, 303, 304, 305, 306, 307, 308,
] as const;
export type SuccessStatusCode = (typeof successStatusCodes)[number];

export const errorStatusCodes = [
  400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 421, 422, 423, 424,
  425, 426, 428, 429, 431, 451, 500, 501, 502, 503, 504, 505, 506, 507, 508, 510, 511,
] as const;
export type ErrorStatusCode = (typeof errorStatusCodes)[number];

// Taken from https://github.com/unjs/fetchdts/blob/ec4eaeab5d287116171fc1efd61f4a1ad34e4609/src/fetch.ts#L3
export interface TypedHeaders<TypedHeaderValues = unknown> extends Omit<
  Headers,
  "append" | "delete" | "get" | "getSetCookie" | "has" | "set" | "forEach"
> {
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/append) */
  append: <Name extends Extract<keyof TypedHeaderValues, string> | (string & {})>(
    name: Name,
    value: Lowercase<Name> extends keyof TypedHeaderValues ? TypedHeaderValues[Lowercase<Name>] : string,
  ) => void;
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/delete) */
  delete: <Name extends Extract<keyof TypedHeaderValues, string> | (string & {})>(name: Name) => void;
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/get) */
  get: <Name extends Extract<keyof TypedHeaderValues, string> | (string & {})>(
    name: Name,
  ) => (Lowercase<Name> extends keyof TypedHeaderValues ? TypedHeaderValues[Lowercase<Name>] : string) | null;
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/getSetCookie) */
  getSetCookie: () => string[];
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/has) */
  has: <Name extends Extract<keyof TypedHeaderValues, string> | (string & {})>(name: Name) => boolean;
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/set) */
  set: <Name extends Extract<keyof TypedHeaderValues, string> | (string & {})>(
    name: Name,
    value: Lowercase<Name> extends keyof TypedHeaderValues ? TypedHeaderValues[Lowercase<Name>] : string,
  ) => void;
  forEach: (
    callbackfn: (
      value: TypedHeaderValues[keyof TypedHeaderValues] | (string & {}),
      key: Extract<keyof TypedHeaderValues, string> | (string & {}),
      parent: TypedHeaders<TypedHeaderValues>,
    ) => void,
    thisArg?: unknown,
  ) => void;
}

/** @see https://developer.mozilla.org/en-US/docs/Web/API/Response */
export interface TypedSuccessResponse<TSuccess, TStatusCode, THeaders> extends Omit<
  FetcherResponse,
  "ok" | "status" | "json" | "headers"
> {
  ok: true;
  status: TStatusCode;
  headers: never extends THeaders ? FetcherResponse["headers"] : TypedHeaders<THeaders>;
  data: TSuccess;
  /** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Response/json) */
  json: () => Promise<TSuccess>;
}

/** @see https://developer.mozilla.org/en-US/docs/Web/API/Response */
export interface TypedErrorResponse<TData, TStatusCode, THeaders> extends Omit<
  FetcherResponse,
  "ok" | "status" | "json" | "headers"
> {
  ok: false;
  status: TStatusCode;
  headers: never extends THeaders ? FetcherResponse["headers"] : TypedHeaders<THeaders>;
  data: TData;
  /** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Response/json) */
  json: () => Promise<TData>;
}

type StatusCodeFromKey<TKey> = TKey extends `${infer TStatusCode extends number}`
  ? TStatusCode
  : TKey extends number
    ? TKey
    : never;

export type TypedApiResponse<TAllResponses = {}, THeaders = {}> = {
  [K in keyof TAllResponses]: StatusCodeFromKey<K> extends infer TStatusCode extends number
    ? TStatusCode extends SuccessStatusCode
      ? TypedSuccessResponse<TAllResponses[K], TStatusCode, K extends keyof THeaders ? THeaders[K] : never>
      : TypedErrorResponse<TAllResponses[K], TStatusCode, K extends keyof THeaders ? THeaders[K] : never>
    : never;
}[keyof TAllResponses];

type __TypedOpenapiSchema<TOutput, TInput = TOutput> = {
  readonly __typedOpenapiOutput: TOutput;
  readonly __typedOpenapiInput: TInput;
};
type OptionalUndefinedKeys<T> = {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K];
} & {
  [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<T[K], undefined>;
};
export type InferSchemaValue<T> = T extends string | number | boolean | bigint | symbol | null | undefined
  ? T
  : T extends __TypedOpenapiSchema<infer O>
    ? O
    : T extends z.ZodType
      ? z.infer<T>
      : T extends (...args: never[]) => unknown
        ? T
        : T extends object
          ? { [K in keyof T]: InferSchemaValue<T[K]> }
          : T;
type InferSchemaInputRaw<T> = T extends string | number | boolean | bigint | symbol | null | undefined
  ? T
  : T extends __TypedOpenapiSchema<infer _O, infer I>
    ? I
    : T extends z.ZodType
      ? z.input<T>
      : T extends (...args: never[]) => unknown
        ? T
        : T extends object
          ? { [K in keyof T]: InferSchemaInputRaw<T[K]> }
          : T;
type InferSchemaInput<T> = OptionalUndefinedKeys<InferSchemaInputRaw<T>>;

export type SafeApiResponse<TEndpoint> = TEndpoint extends { responses: infer TResponses }
  ? TResponses extends Record<string | number, unknown>
    ? TypedApiResponse<
        InferSchemaValue<TResponses>,
        TEndpoint extends { responseHeaders: infer THeaders } ? InferSchemaValue<THeaders> : never
      >
    : never
  : never;

export type InferResponseByStatus<TEndpoint, TStatusCode> = Extract<
  SafeApiResponse<TEndpoint>,
  { status: TStatusCode }
>;

/**
 * Success-body payload — InferSchemaValue only on success statuses.
 * Filter with extends {} like the old Extract { data: {} } so unknown bodies (e.g. 304) drop out.
 */
export type InferSuccessData<TEndpoint> = TEndpoint extends { responses: infer TResponses }
  ? {
      [K in keyof TResponses]: StatusCodeFromKey<K> extends infer TStatusCode extends number
        ? TStatusCode extends SuccessStatusCode
          ? Extract<InferSchemaValue<TResponses[K]>, {}>
          : never
        : never;
    }[keyof TResponses]
  : never;

type RequiredKeys<T> = {
  [P in keyof T]-?: undefined extends T[P] ? never : P;
}[keyof T];

type MaybeOptionalArg<T> = RequiredKeys<T> extends never ? [config?: T] : [config: T];
type NotNever<T> = [T] extends [never] ? false : true;

export type ApiQueryOptions = {
  /** Override whether a generated TanStack Query consumes TanStack Query's AbortSignal. */
  consumeQuerySignal?: boolean;
};

/** Call options merged onto inferred endpoint parameters. */
type ApiRequestOptions = {
  overrides?: RequestInit;
  queryOptions?: ApiQueryOptions;
  withResponse?: boolean;
  throwOnStatusError?: boolean;
  validate?: ValidateSide;
};

/** Parameter bag for an endpoint + request options. */
export type ApiCallParams<TEndpoint> = TEndpoint extends { parameters: infer UParams }
  ? NotNever<InferSchemaInput<UParams>> extends true
    ? InferSchemaInput<UParams> & ApiRequestOptions
    : ApiRequestOptions
  : ApiRequestOptions;

/** Resolve response type from withResponse flag on the call config. */
export type ApiCallResult<TEndpoint, TParams> = TParams extends { withResponse: true }
  ? SafeApiResponse<TEndpoint>
  : InferSuccessData<TEndpoint>;

export type ValidateSide = "none" | "input" | "output" | "both";
export type OnValidate = (ctx: {
  side: "input" | "output";
  method: string;
  path: string;
  schema: unknown;
  value: unknown;
}) => unknown | Promise<unknown>;

// </ApiClientTypes>

// <TypedStatusError>
export class TypedStatusError<TData = unknown> extends Error {
  response: TypedErrorResponse<TData, ErrorStatusCode, unknown>;
  status: number;
  constructor(response: TypedErrorResponse<TData, ErrorStatusCode, unknown>) {
    super(`HTTP ${response.status}: ${response.statusText}`);
    this.name = "TypedStatusError";
    this.response = response;
    this.status = response.status;
  }
}
// </TypedStatusError>

// <ValidateHelpers>
const defaultParse = (schema: unknown, value: unknown): unknown => {
  return (schema as { parse: (v: unknown) => unknown }).parse(value);
};

const runValidate = async (ctx: {
  side: "input" | "output";
  method: string;
  path: string;
  schema: unknown;
  value: unknown;
  onValidate?: OnValidate;
}): Promise<unknown> => {
  if (ctx.onValidate) return ctx.onValidate(ctx);
  return defaultParse(ctx.schema, ctx.value);
};
// </ValidateHelpers>

// <ApiClient>
const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

export class ApiClient {
  baseUrl: string = "";
  successStatusCodes = successStatusCodes;
  errorStatusCodes = errorStatusCodes;
  validate: ValidateSide = "both";
  onValidate?: OnValidate;

  constructor(
    public fetcher: Fetcher,
    options?: { validate?: ValidateSide; onValidate?: OnValidate },
  ) {
    if (options?.validate !== undefined) this.validate = options.validate;
    if (options?.onValidate) this.onValidate = options.onValidate;
  }

  setBaseUrl(baseUrl: string) {
    this.baseUrl = baseUrl;
    return this;
  }

  setValidate(validate: ValidateSide) {
    this.validate = validate;
    return this;
  }

  setOnValidate(onValidate: OnValidate | undefined) {
    if (onValidate === undefined) {
      delete this.onValidate;
    } else {
      this.onValidate = onValidate;
    }
    return this;
  }

  /**
   * Replace path parameters in URL
   * Supports both OpenAPI format {param} and Express format :param
   */
  defaultDecodePathParams = (url: string, params: unknown, styles?: Record<string, ParameterSerialization>): string => {
    const record = (params ?? {}) as Record<string, unknown>;
    const encode = (value: unknown) => encodeURIComponent(String(value));
    const serialize = (key: string, value: unknown): string => {
      const parameterStyle = styles?.[key];
      const style = parameterStyle?.style ?? "simple";
      const explode = parameterStyle?.explode ?? false;
      if (style === "label") {
        if (Array.isArray(value))
          return (
            "." +
            value
              .filter((item) => item != null)
              .map(encode)
              .join(explode ? "." : ",")
          );
        if (isPlainObject(value)) {
          const entries = Object.entries(value as Record<string, unknown>).filter(([, item]) => item != null);
          return (
            "." +
            (explode
              ? entries.map(([name, item]) => encode(name) + "=" + encode(item)).join(".")
              : entries.flatMap(([name, item]) => [encode(name), encode(item)]).join(","))
          );
        }
        return "." + encode(value);
      }
      if (style === "matrix") {
        if (Array.isArray(value))
          return explode
            ? value
                .filter((item) => item != null)
                .map((item) => ";" + key + "=" + encode(item))
                .join("")
            : ";" +
                key +
                "=" +
                value
                  .filter((item) => item != null)
                  .map(encode)
                  .join(",");
        if (isPlainObject(value)) {
          const entries = Object.entries(value as Record<string, unknown>).filter(([, item]) => item != null);
          return explode
            ? entries.map(([name, item]) => ";" + encode(name) + "=" + encode(item)).join("")
            : ";" + key + "=" + entries.flatMap(([name, item]) => [encode(name), encode(item)]).join(",");
        }
        return ";" + key + "=" + encode(value);
      }
      if (Array.isArray(value))
        return value
          .filter((item) => item != null)
          .map(encode)
          .join(",");
      if (isPlainObject(value)) {
        return Object.entries(value as Record<string, unknown>)
          .filter(([, item]) => item != null)
          .map(([name, item]) => (explode ? encode(name) + "=" + encode(item) : [encode(name), encode(item)]))
          .flat()
          .join(",");
      }
      return encode(value);
    };
    return url
      .replace(/{([^}]+)}/g, (_, key: string) => (record[key] != null ? serialize(key, record[key]) : `{${key}}`))
      .replace(/:([a-zA-Z0-9_]+)/g, (_, key: string) =>
        record[key] != null ? serialize(key, record[key]) : `:${key}`,
      );
  };

  /** Uses URLSearchParams, skips null/undefined values */
  defaultEncodeSearchParams = (
    queryParams: unknown,
    styles?: Record<string, ParameterSerialization>,
  ): URLSearchParams | undefined => {
    if (!queryParams || typeof queryParams !== "object") return;

    const searchParams = new URLSearchParams();
    const rawEntries: Array<{ key: string; value: string; allowReserved: boolean }> = [];
    const append = (key: string, value: unknown, allowReserved = false) => {
      const stringValue = String(value);
      searchParams.append(key, stringValue);
      rawEntries.push({ key, value: stringValue, allowReserved });
    };
    const encodeQueryComponent = (value: string, allowReserved: boolean) => {
      const encoded = encodeURIComponent(value);
      return allowReserved
        ? encoded.replace(/%3A|%2F|%3F|%40|%21|%24|%26|%27|%28|%29|%2A|%2B|%2C|%3B|%3D|%5B|%5D/gi, (part) =>
            decodeURIComponent(part),
          )
        : encoded;
    };
    Object.defineProperty(searchParams, "toString", {
      value: () =>
        rawEntries
          .map(
            ({ key, value, allowReserved }) =>
              `${encodeQueryComponent(key, false)}=${encodeQueryComponent(value, allowReserved)}`,
          )
          .join("&"),
    });
    Object.entries(queryParams as Record<string, unknown>).forEach(([key, value]) => {
      if (value != null) {
        // Skip null/undefined values
        const parameterStyle = styles?.[key];
        const style = parameterStyle?.style ?? "form";
        const explode = parameterStyle?.explode ?? true;
        const allowReserved = parameterStyle?.allowReserved === true;
        if (Array.isArray(value)) {
          if (style === "spaceDelimited")
            append(
              key,
              value
                .filter((item) => item != null)
                .map(String)
                .join(" "),
              allowReserved,
            );
          else if (style === "pipeDelimited")
            append(
              key,
              value
                .filter((item) => item != null)
                .map(String)
                .join("|"),
              allowReserved,
            );
          else if (explode) value.forEach((val) => val != null && append(key, val, allowReserved));
          else
            append(
              key,
              value
                .filter((item) => item != null)
                .map(String)
                .join(","),
              allowReserved,
            );
        } else if (isPlainObject(value)) {
          const entries = Object.entries(value as Record<string, unknown>).filter(
            ([, nestedValue]) => nestedValue != null,
          );
          if (style === "deepObject") {
            for (const [nestedKey, nestedValue] of entries) {
              if (Array.isArray(nestedValue))
                nestedValue.forEach((item) => item != null && append(`${key}[${nestedKey}]`, item, allowReserved));
              else append(`${key}[${nestedKey}]`, nestedValue, allowReserved);
            }
          } else if (explode) {
            for (const [nestedKey, nestedValue] of entries) {
              if (Array.isArray(nestedValue))
                nestedValue.forEach((item) => item != null && append(nestedKey, item, allowReserved));
              else append(nestedKey, nestedValue, allowReserved);
            }
          } else {
            append(
              key,
              entries
                .flatMap(([nestedKey, nestedValue]) => [
                  nestedKey,
                  ...(Array.isArray(nestedValue) ? nestedValue : [nestedValue]),
                ])
                .map(String)
                .join(","),
              allowReserved,
            );
          }
        } else {
          append(key, value, allowReserved);
        }
      }
    });

    return searchParams;
  };

  /** Append cookie params as a Cookie header (or merge into existing). */
  defaultEncodeCookies = (cookies: unknown, headers: Headers): void => {
    if (!cookies || typeof cookies !== "object") return;
    const parts = Object.entries(cookies as Record<string, unknown>)
      .filter(([, value]) => value != null)
      .map(([key, value]) => `${key}=${String(value)}`);
    if (!parts.length) return;
    const existing = headers.get("cookie");
    headers.set("cookie", existing ? `${existing}; ${parts.join("; ")}` : parts.join("; "));
  };

  defaultParseResponseData = async (response: FetcherResponse): Promise<unknown> => {
    const contentType = response.headers.get("content-type") ?? "";
    const normalizedContentType = contentType.toLowerCase();
    if (normalizedContentType.includes("text/event-stream")) {
      return response.body ?? null;
    }
    if (normalizedContentType.startsWith("text/")) {
      return await response.text();
    }

    if (normalizedContentType.startsWith("application/octet-stream")) {
      return new Blob([await response.arrayBuffer()]);
    }

    if (
      normalizedContentType.includes("application/json") ||
      (normalizedContentType.includes("application/") && normalizedContentType.includes("json")) ||
      normalizedContentType === "*/*"
    ) {
      try {
        return await response.json();
      } catch {
        return undefined;
      }
    }

    return;
  };

  // <ApiClient.post>
  post<Path extends keyof PostEndpoints, TEndpoint extends PostEndpoints[Path]>(
    path: Path,
    ...params: MaybeOptionalArg<
      TEndpoint extends { parameters: infer UParams }
        ? NotNever<InferSchemaInput<UParams>> extends true
          ? InferSchemaInput<UParams> & {
              overrides?: RequestInit;
              queryOptions?: ApiQueryOptions;
              withResponse: true;
              throwOnStatusError?: boolean;
              validate?: ValidateSide;
            }
          : {
              overrides?: RequestInit;
              queryOptions?: ApiQueryOptions;
              withResponse: true;
              throwOnStatusError?: boolean;
              validate?: ValidateSide;
            }
        : {
            overrides?: RequestInit;
            queryOptions?: ApiQueryOptions;
            withResponse: true;
            throwOnStatusError?: boolean;
            validate?: ValidateSide;
          }
    >
  ): Promise<SafeApiResponse<TEndpoint>>;

  post<Path extends keyof PostEndpoints, TEndpoint extends PostEndpoints[Path]>(
    path: Path,
    ...params: MaybeOptionalArg<
      TEndpoint extends { parameters: infer UParams }
        ? NotNever<InferSchemaInput<UParams>> extends true
          ? InferSchemaInput<UParams> & {
              overrides?: RequestInit;
              queryOptions?: ApiQueryOptions;
              withResponse?: false;
              throwOnStatusError?: boolean;
              validate?: ValidateSide;
            }
          : {
              overrides?: RequestInit;
              queryOptions?: ApiQueryOptions;
              withResponse?: false;
              throwOnStatusError?: boolean;
              validate?: ValidateSide;
            }
        : {
            overrides?: RequestInit;
            queryOptions?: ApiQueryOptions;
            withResponse?: false;
            throwOnStatusError?: boolean;
            validate?: ValidateSide;
          }
    >
  ): Promise<InferSuccessData<TEndpoint>>;

  post<Path extends keyof PostEndpoints>(path: Path, ...params: [config?: unknown]): Promise<unknown> {
    return this.request("post", path, params[0] as never) as Promise<unknown>;
  }
  // </ApiClient.post>

  // <ApiClient.get>
  get<Path extends keyof GetEndpoints, TEndpoint extends GetEndpoints[Path]>(
    path: Path,
    ...params: MaybeOptionalArg<
      TEndpoint extends { parameters: infer UParams }
        ? NotNever<InferSchemaInput<UParams>> extends true
          ? InferSchemaInput<UParams> & {
              overrides?: RequestInit;
              queryOptions?: ApiQueryOptions;
              withResponse: true;
              throwOnStatusError?: boolean;
              validate?: ValidateSide;
            }
          : {
              overrides?: RequestInit;
              queryOptions?: ApiQueryOptions;
              withResponse: true;
              throwOnStatusError?: boolean;
              validate?: ValidateSide;
            }
        : {
            overrides?: RequestInit;
            queryOptions?: ApiQueryOptions;
            withResponse: true;
            throwOnStatusError?: boolean;
            validate?: ValidateSide;
          }
    >
  ): Promise<SafeApiResponse<TEndpoint>>;

  get<Path extends keyof GetEndpoints, TEndpoint extends GetEndpoints[Path]>(
    path: Path,
    ...params: MaybeOptionalArg<
      TEndpoint extends { parameters: infer UParams }
        ? NotNever<InferSchemaInput<UParams>> extends true
          ? InferSchemaInput<UParams> & {
              overrides?: RequestInit;
              queryOptions?: ApiQueryOptions;
              withResponse?: false;
              throwOnStatusError?: boolean;
              validate?: ValidateSide;
            }
          : {
              overrides?: RequestInit;
              queryOptions?: ApiQueryOptions;
              withResponse?: false;
              throwOnStatusError?: boolean;
              validate?: ValidateSide;
            }
        : {
            overrides?: RequestInit;
            queryOptions?: ApiQueryOptions;
            withResponse?: false;
            throwOnStatusError?: boolean;
            validate?: ValidateSide;
          }
    >
  ): Promise<InferSuccessData<TEndpoint>>;

  get<Path extends keyof GetEndpoints>(path: Path, ...params: [config?: unknown]): Promise<unknown> {
    return this.request("get", path, params[0] as never) as Promise<unknown>;
  }
  // </ApiClient.get>

  // <ApiClient.delete>
  delete<Path extends keyof DeleteEndpoints, TEndpoint extends DeleteEndpoints[Path]>(
    path: Path,
    ...params: MaybeOptionalArg<
      TEndpoint extends { parameters: infer UParams }
        ? NotNever<InferSchemaInput<UParams>> extends true
          ? InferSchemaInput<UParams> & {
              overrides?: RequestInit;
              queryOptions?: ApiQueryOptions;
              withResponse: true;
              throwOnStatusError?: boolean;
              validate?: ValidateSide;
            }
          : {
              overrides?: RequestInit;
              queryOptions?: ApiQueryOptions;
              withResponse: true;
              throwOnStatusError?: boolean;
              validate?: ValidateSide;
            }
        : {
            overrides?: RequestInit;
            queryOptions?: ApiQueryOptions;
            withResponse: true;
            throwOnStatusError?: boolean;
            validate?: ValidateSide;
          }
    >
  ): Promise<SafeApiResponse<TEndpoint>>;

  delete<Path extends keyof DeleteEndpoints, TEndpoint extends DeleteEndpoints[Path]>(
    path: Path,
    ...params: MaybeOptionalArg<
      TEndpoint extends { parameters: infer UParams }
        ? NotNever<InferSchemaInput<UParams>> extends true
          ? InferSchemaInput<UParams> & {
              overrides?: RequestInit;
              queryOptions?: ApiQueryOptions;
              withResponse?: false;
              throwOnStatusError?: boolean;
              validate?: ValidateSide;
            }
          : {
              overrides?: RequestInit;
              queryOptions?: ApiQueryOptions;
              withResponse?: false;
              throwOnStatusError?: boolean;
              validate?: ValidateSide;
            }
        : {
            overrides?: RequestInit;
            queryOptions?: ApiQueryOptions;
            withResponse?: false;
            throwOnStatusError?: boolean;
            validate?: ValidateSide;
          }
    >
  ): Promise<InferSuccessData<TEndpoint>>;

  delete<Path extends keyof DeleteEndpoints>(path: Path, ...params: [config?: unknown]): Promise<unknown> {
    return this.request("delete", path, params[0] as never) as Promise<unknown>;
  }
  // </ApiClient.delete>

  // <ApiClient.patch>
  patch<Path extends keyof PatchEndpoints, TEndpoint extends PatchEndpoints[Path]>(
    path: Path,
    ...params: MaybeOptionalArg<
      TEndpoint extends { parameters: infer UParams }
        ? NotNever<InferSchemaInput<UParams>> extends true
          ? InferSchemaInput<UParams> & {
              overrides?: RequestInit;
              queryOptions?: ApiQueryOptions;
              withResponse: true;
              throwOnStatusError?: boolean;
              validate?: ValidateSide;
            }
          : {
              overrides?: RequestInit;
              queryOptions?: ApiQueryOptions;
              withResponse: true;
              throwOnStatusError?: boolean;
              validate?: ValidateSide;
            }
        : {
            overrides?: RequestInit;
            queryOptions?: ApiQueryOptions;
            withResponse: true;
            throwOnStatusError?: boolean;
            validate?: ValidateSide;
          }
    >
  ): Promise<SafeApiResponse<TEndpoint>>;

  patch<Path extends keyof PatchEndpoints, TEndpoint extends PatchEndpoints[Path]>(
    path: Path,
    ...params: MaybeOptionalArg<
      TEndpoint extends { parameters: infer UParams }
        ? NotNever<InferSchemaInput<UParams>> extends true
          ? InferSchemaInput<UParams> & {
              overrides?: RequestInit;
              queryOptions?: ApiQueryOptions;
              withResponse?: false;
              throwOnStatusError?: boolean;
              validate?: ValidateSide;
            }
          : {
              overrides?: RequestInit;
              queryOptions?: ApiQueryOptions;
              withResponse?: false;
              throwOnStatusError?: boolean;
              validate?: ValidateSide;
            }
        : {
            overrides?: RequestInit;
            queryOptions?: ApiQueryOptions;
            withResponse?: false;
            throwOnStatusError?: boolean;
            validate?: ValidateSide;
          }
    >
  ): Promise<InferSuccessData<TEndpoint>>;

  patch<Path extends keyof PatchEndpoints>(path: Path, ...params: [config?: unknown]): Promise<unknown> {
    return this.request("patch", path, params[0] as never) as Promise<unknown>;
  }
  // </ApiClient.patch>

  // <ApiClient.request>
  /**
   * Generic request method with full type-safety for any endpoint
   */
  request<
    TMethod extends keyof EndpointByMethod,
    TPath extends keyof EndpointByMethod[TMethod],
    TEndpoint extends EndpointByMethod[TMethod][TPath],
  >(
    method: TMethod,
    path: TPath,
    ...params: MaybeOptionalArg<
      TEndpoint extends { parameters: infer UParams }
        ? NotNever<InferSchemaInput<UParams>> extends true
          ? InferSchemaInput<UParams> & {
              overrides?: RequestInit;
              queryOptions?: ApiQueryOptions;
              withResponse: true;
              throwOnStatusError?: boolean;
              validate?: ValidateSide;
            }
          : {
              overrides?: RequestInit;
              queryOptions?: ApiQueryOptions;
              withResponse: true;
              throwOnStatusError?: boolean;
              validate?: ValidateSide;
            }
        : {
            overrides?: RequestInit;
            queryOptions?: ApiQueryOptions;
            withResponse: true;
            throwOnStatusError?: boolean;
            validate?: ValidateSide;
          }
    >
  ): Promise<SafeApiResponse<TEndpoint>>;

  request<
    TMethod extends keyof EndpointByMethod,
    TPath extends keyof EndpointByMethod[TMethod],
    TEndpoint extends EndpointByMethod[TMethod][TPath],
  >(
    method: TMethod,
    path: TPath,
    ...params: MaybeOptionalArg<
      TEndpoint extends { parameters: infer UParams }
        ? NotNever<InferSchemaInput<UParams>> extends true
          ? InferSchemaInput<UParams> & {
              overrides?: RequestInit;
              queryOptions?: ApiQueryOptions;
              withResponse?: false;
              throwOnStatusError?: boolean;
              validate?: ValidateSide;
            }
          : {
              overrides?: RequestInit;
              queryOptions?: ApiQueryOptions;
              withResponse?: false;
              throwOnStatusError?: boolean;
              validate?: ValidateSide;
            }
        : {
            overrides?: RequestInit;
            queryOptions?: ApiQueryOptions;
            withResponse?: false;
            throwOnStatusError?: boolean;
            validate?: ValidateSide;
          }
    >
  ): Promise<InferSuccessData<TEndpoint>>;

  request<
    TMethod extends keyof EndpointByMethod,
    TPath extends keyof EndpointByMethod[TMethod],
    TEndpoint extends EndpointByMethod[TMethod][TPath],
  >(method: TMethod, path: TPath, ...params: [config?: unknown]): Promise<unknown> {
    return (async () => {
      const requestParams = params[0] as
        | (EndpointParameters & {
            overrides?: RequestInit;
            queryOptions?: ApiQueryOptions;
            withResponse?: boolean;
            throwOnStatusError?: boolean;
            validate?: ValidateSide;
          })
        | undefined;
      const withResponse = requestParams?.withResponse;
      const throwOnStatusError = requestParams?.throwOnStatusError ?? (withResponse ? false : true);
      let overrides = requestParams?.overrides;
      const validateSide: ValidateSide = requestParams?.validate ?? this.validate;

      const parametersToSend: EndpointParameters = {};
      if (requestParams?.body !== undefined) parametersToSend.body = requestParams.body;
      if (requestParams?.query !== undefined) parametersToSend.query = requestParams.query;
      if (requestParams?.header !== undefined) parametersToSend.header = requestParams.header;
      if (requestParams?.path !== undefined) parametersToSend.path = requestParams.path;
      if (requestParams?.cookie !== undefined) parametersToSend.cookie = requestParams.cookie;

      type RuntimeEndpoint = {
        parameters?: Partial<Record<"body" | "query" | "header" | "path" | "cookie", unknown>>;
        responses?: Record<string, unknown>;
      };
      const endpointSchema = EndpointByMethod[method][path] as RuntimeEndpoint;
      const shouldValidateInput = validateSide === "input" || validateSide === "both";
      if (shouldValidateInput && endpointSchema.parameters) {
        const paramSchema = endpointSchema.parameters;
        for (const key of ["body", "query", "header", "path", "cookie"] as const) {
          const schema = paramSchema[key];
          const value = parametersToSend[key];
          if (schema !== undefined && value !== undefined) {
            parametersToSend[key] = await runValidate({
              side: "input",
              method: String(method),
              path: String(path),
              schema,
              value,
              ...(this.onValidate ? { onValidate: this.onValidate } : {}),
            });
          }
        }
      }

      const resolvedPath = (this.fetcher.decodePathParams ?? this.defaultDecodePathParams)(
        this.baseUrl + (path as string),
        parametersToSend.path ?? {},
        endpointParameterStyles[method]?.[path]?.path,
      );
      const url = new URL(resolvedPath);
      const urlSearchParams = (this.fetcher.encodeSearchParams ?? this.defaultEncodeSearchParams)(
        parametersToSend.query,
        endpointParameterStyles[method]?.[path]?.query,
      );

      if (parametersToSend.cookie) {
        const headers = new Headers((overrides as RequestInit | undefined)?.headers);
        (this.fetcher.encodeCookies ?? this.defaultEncodeCookies)(parametersToSend.cookie, headers);
        overrides = { ...overrides, headers };
      }

      const parameterStyles = endpointParameterStyles[method]?.[path as string];
      const response = await this.fetcher.fetch({
        method: method,
        path: path as string,
        url,
        ...(urlSearchParams ? { urlSearchParams } : {}),
        ...(Object.keys(parametersToSend).length ? { parameters: parametersToSend } : {}),
        requestFormat: endpointRequestFormats[method]?.[path] ?? "json",
        ...(parameterStyles ? { parameterStyles } : {}),
        security: endpointSecurityRequirements[method]?.[path] ?? defaultSecurityRequirements,
        ...(overrides ? { overrides } : {}),
        throwOnStatusError,
      });
      const responseFormat = endpointResponseFormats[method]?.[path] ?? "json";
      let data =
        responseFormat === "sse"
          ? (response.body ?? null)
          : await (this.fetcher.parseResponseData ?? this.defaultParseResponseData)(response);
      const shouldValidateOutput = validateSide === "output" || validateSide === "both";
      if (
        shouldValidateOutput &&
        responseFormat !== "sse" &&
        (response.ok || !(errorStatusCodes as readonly number[]).includes(response.status)) &&
        endpointSchema?.responses
      ) {
        const responseSchema =
          endpointSchema.responses[String(response.status)] ??
          endpointSchema.responses[String(Math.floor(response.status / 100)) + "xx"] ??
          endpointSchema.responses[String(Math.floor(response.status / 100)) + "XX"] ??
          endpointSchema.responses["default"];
        if (responseSchema) {
          data = await runValidate({
            side: "output",
            method: String(method),
            path: String(path),
            schema: responseSchema,
            value: data,
            ...(this.onValidate ? { onValidate: this.onValidate } : {}),
          });
        }
      }
      const typedResponse = Object.assign(response, {
        data: data,
        json: () => Promise.resolve(data),
      }) as SafeApiResponse<TEndpoint>;

      if (throwOnStatusError && (errorStatusCodes as readonly number[]).includes(response.status)) {
        throw new TypedStatusError(typedResponse as TypedErrorResponse<unknown, ErrorStatusCode, unknown>);
      }

      return withResponse ? typedResponse : data;
    })();
  }
  // </ApiClient.request>
}

export function createApiClient(
  fetcher: Fetcher,
  baseUrl?: string,
  options?: { validate?: ValidateSide; onValidate?: OnValidate },
) {
  return new ApiClient(fetcher, options).setBaseUrl(baseUrl ?? "");
}

/**
 Example usage:
 const api = createApiClient((method, url, params) =>
   fetch(url, { method, body: JSON.stringify(params) }).then((res) => res.json()),
 );
 api.get("/users").then((users) => console.log(users));
 api.post("/users", { body: { name: "John" } }).then((user) => console.log(user));
 api.put("/users/:id", { path: { id: 1 }, body: { name: "John" } }).then((user) => console.log(user));

 // With error handling
 const result = await api.get("/users/{id}", { path: { id: "123" }, withResponse: true });
 if (result.ok) {
   // Access data directly
   const user = result.data;
   console.log(user);

   // Or use the json() method for compatibility
   const userFromJson = await result.json();
   console.log(userFromJson);
 } else {
   const error = result.data;
   console.error(`Error ${result.status}:`, error);
 }
*/

// </ApiClient>
