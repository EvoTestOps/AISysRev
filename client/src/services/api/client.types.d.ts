export namespace Schemas {
  // <Schemas>
  export type Body_attach_pdf_to_paper_api_v1_files__paper_uuid__attach_pdf_post = { file: string };
  export type Body_import_fulltext_api_v1_files_import_fulltext_post = {
    project_uuid: string;
    xml_file: string;
    pdf_files: Array<string>;
    pdf_relative_paths: Array<string>;
  };
  export type ScreeningTarget = "PAPER" | "GITHUB_REPOSITORY";
  export type Body_process_csv_api_v1_files_upload_post = {
    project_uuid: string;
    files: Array<string>;
    screening_target?: ScreeningTarget;
  };
  export type Body_process_pdfs_api_v1_files_upload_pdfs_post = { project_uuid: string; files: Array<string> };
  /**
   * Config parameter is something that the provider needs (e.g. API key or certain config) that must be provided via the AISysRev UI.
   */
  export type ConfigParameter = {
    key: string;
    title: string;
    description?: string | null;
    type?: "string" | "number" | "boolean";
    defaultValue?: string | number | number | boolean | null;
    secret?: boolean;
  };
  export type ConsentAccept = { terms: boolean; privacy_policy: boolean; research?: boolean | null };
  export type Criteria = {
    inclusion_criteria: Array<string>;
    exclusion_criteria: Array<string>;
    inclusion_expression?: string | null;
    exclusion_expression?: string | null;
  };
  export type LikertDecision = "1" | "2" | "3" | "4" | "5" | "6" | "7";
  export type Decision = {
    /**
     * Whether the criterion or relevance is clearly met (true) or not (false).
     */
    binary_decision: boolean;
    /**
     * The likelihood, that the criterion applies or the primary study is relevant. A value closer to `1.0` means that it is extremely likely (very strong match). A value closer to `0.0` means it is extremely unlikely (very weak or no match). You are encouraged to use intermediate values (e.g. `0.1`, `0.2`, `0.35`, `0.7`, etc..), not just `0.0` or `1.0`
     */
    probability_decision: number;
    likert_decision: LikertDecision;
    /**
     * Reason for the decision.
     */
    reason: string;
  };
  export type Criterion = {
    /**
     * Criterion ID. E.g. IC1, IC2, IC3 etc.. for inclusion criteria or EC1, EC2, EC3 etc.. for exclusion criteria
     */
    name: string;
    decision: Decision;
  };
  export type CriterionError = { error: string };
  export type CriterionResponse = {
    /**
     * The likelihood, that the criterion applies or the primary study is relevant. A float between 0.000 and 1.000: closer to 1.000 means extremely likely (very strong match), closer to 0.000 means extremely unlikely (very weak or no match). Use intermediate values, not just 0.000 or 1.000.
     */
    probability_decision: number;
    /**
     * Reasoning for the probability estimate.
     */
    reason: string;
  };
  export type FewShotPreferences = { inc_seed_papers: Array<string>; exc_seed_papers: Array<string> };
  export type FewShotPromptingConfig = {
    screening_type?: "FEW_SHOT";
    screening_target?: ScreeningTarget;
    seed_paper_inc: Array<string>;
    seed_paper_exc: Array<string>;
    remember_selection: boolean;
  };
  export type FileReadWithPaperCount = {
    uuid: string;
    project_uuid: string;
    filename: string;
    mime_type: string;
    storage_path?: string | null;
    paper_count: number;
  };
  export type FulltextImportUnmatched = { filename: string; reason: string };
  export type FulltextImportResult = { matched_count: number; unmatched: Array<FulltextImportUnmatched> };
  export type ValidationError = {
    loc: Array<string | number>;
    msg: string;
    type: string;
    input?: unknown;
    ctx?: Record<string, unknown>;
  };
  export type HTTPValidationError = Partial<{ detail: Array<ValidationError> }>;
  export type ZeroShotPromptingConfig = Partial<{ screening_type: "ZERO_SHOT"; screening_target: ScreeningTarget }>;
  export type PerCriteriaPromptingConfig = Partial<{
    screening_type: "PER_CRITERIA";
    screening_target: ScreeningTarget;
  }>;
  export type LLMModelConfig = {
    provider_name: string;
    model_name: string;
    provider_parameters: Record<string, unknown>;
    model_parameters: Record<string, unknown>;
  };
  export type JobScreeningMode = "TEXT" | "PDF" | "AUTOMATIC";
  export type JobCreateRequest = {
    project_uuid: string;
    prompting_config: ZeroShotPromptingConfig | FewShotPromptingConfig | PerCriteriaPromptingConfig;
    llm_config: LLMModelConfig;
    screening_mode?: JobScreeningMode;
  };
  export type JobRead = {
    uuid: string;
    project_uuid: string;
    prompting_config: ZeroShotPromptingConfig | FewShotPromptingConfig | PerCriteriaPromptingConfig;
    llm_config: LLMModelConfig;
    screening_mode: JobScreeningMode;
    created_at: Date;
    updated_at: Date;
  };
  export type JobStatus = "NOT_STARTED" | "RUNNING" | "PARTIAL_SUCCESS" | "SUCCESS" | "FAILED" | "CANCELLED";
  export type JobStats = { total: number; success: number; failed: number; status: JobStatus };
  export type JobReadWithStats = {
    uuid: string;
    id: number;
    project_uuid: string;
    prompting_config: ZeroShotPromptingConfig | FewShotPromptingConfig | PerCriteriaPromptingConfig;
    llm_config: LLMModelConfig;
    screening_mode: JobScreeningMode;
    created_at: Date;
    updated_at: Date;
    stats: JobStats;
  };
  export type JobTaskHumanResult = "INCLUDE" | "EXCLUDE" | "UNSURE";
  export type JobTaskHumanResultUpdate = { human_result: JobTaskHumanResult };
  export type JobTaskStatus = "NOT_STARTED" | "PENDING" | "RUNNING" | "DONE" | "ERROR" | "CANCELLED";
  export type StructuredResponse = {
    overall_decision: Decision;
    inclusion_criteria: Array<Criterion>;
    exclusion_criteria: Array<Criterion>;
  };
  export type PerCriteriaResult = {
    mode: "PER_CRITERIA";
    criterion_results: Record<string, CriterionResponse | CriterionError>;
    inclusion_probability: number | null;
    exclusion_probability: number | null;
    overall_probability: number | null;
    binary_decision: boolean | null;
  };
  export type JobTaskRead = {
    uuid: string;
    job_id: number;
    doi: string | null;
    title: string;
    abstract: string;
    paper_uuid: string;
    status: JobTaskStatus;
    result: StructuredResponse | PerCriteriaResult | null;
    human_result?: JobTaskHumanResult | null;
    status_metadata?: Record<string, unknown> | null;
    error?: string | null;
  };
  export type JobTaskReadWithLLMConfig = {
    uuid: string;
    job_id: number;
    doi: string | null;
    title: string;
    abstract: string;
    paper_uuid: string;
    status: JobTaskStatus;
    result: StructuredResponse | PerCriteriaResult | null;
    human_result?: JobTaskHumanResult | null;
    status_metadata?: Record<string, unknown> | null;
    error?: string | null;
    llm_config: LLMModelConfig;
    prompting_config: ZeroShotPromptingConfig | FewShotPromptingConfig | PerCriteriaPromptingConfig;
    screening_mode: JobScreeningMode;
  };
  export type PaperHumanResult = "INCLUDE" | "EXCLUDE" | "UNSURE";
  export type PaperHumanResultUpdate = { human_result: PaperHumanResult };
  export type PaperRead = {
    uuid: string;
    paper_id: number;
    project_uuid: string;
    file_uuid?: string | null;
    pdf_file_uuid?: string | null;
    doi: string | null;
    title: string;
    abstract: string;
    human_result?: PaperHumanResult | null;
    created_at?: Date | null;
    updated_at?: Date | null;
  };
  export type ProjectCreateRequest = { name: string; criteria: Criteria; screening_target?: ScreeningTarget };
  export type ProjectPreferences = { few_shot: FewShotPreferences | null };
  export type ProjectRead = {
    uuid: string;
    name: string;
    criteria: Criteria;
    preferences: ProjectPreferences | null;
    created_at: Date;
    updated_at: Date;
    screening_target?: ScreeningTarget;
    inclusion_criteria_embedding?: Array<Array<number>> | null;
    exclusion_criteria_embedding?: Array<Array<number>> | null;
  };
  export type Provider = {
    name: string;
    title: string;
    description: string;
    provider_parameters_json_schema?: Record<string, unknown> | null;
    model_parameters_json_schema: Record<string, unknown>;
    config_parameters: Array<ConfigParameter>;
  };
  export type ProviderConfigParamsResponse = {
    title: string;
    description: string;
    config_parameters: Array<ConfigParameter>;
  };
  export type ResearchConsentUpdate = { research: boolean };
  export type UpsertData = { name: string; value: string };
  export type UserRead = {
    uuid: string;
    sub: string;
    email?: string | null;
    consent_anonymized_research_usage?: boolean | null;
  };

  // </Schemas>
}

export namespace Endpoints {
  // <Endpoints>

  export type post_Run_test_task_api_v1_run_test_task_post = {
    method: "POST";
    path: "/api/v1/run-test-task";
    requestFormat: "json";
    responseFormat: "json";
    parameters: never;
    responses: { 200: unknown };
  };
  export type get_Get_task_status_api_v1_task_status__task_id__get = {
    method: "GET";
    path: "/api/v1/task-status/{task_id}";
    requestFormat: "json";
    responseFormat: "json";
    parameters: {
      path: { task_id: string };
    };
    responses: { 200: unknown; 422: Schemas.HTTPValidationError };
  };
  export type get_Health_check_api_v1_health_get = {
    method: "GET";
    path: "/api/v1/health";
    requestFormat: "json";
    responseFormat: "json";
    parameters: never;
    responses: { 200: unknown };
  };
  export type get_List_projects_api_v1_project_get = {
    method: "GET";
    path: "/api/v1/project";
    requestFormat: "json";
    responseFormat: "json";
    parameters: never;
    responses: { 200: Array<Schemas.ProjectRead> };
  };
  export type post_Create_new_project_api_v1_project_post = {
    method: "POST";
    path: "/api/v1/project";
    requestFormat: "json";
    responseFormat: "json";
    parameters: {
      body: Schemas.ProjectCreateRequest;
    };
    responses: { 201: unknown; 422: Schemas.HTTPValidationError };
  };
  export type get_Get_project_api_v1_project__uuid__get = {
    method: "GET";
    path: "/api/v1/project/{uuid}";
    requestFormat: "json";
    responseFormat: "json";
    parameters: {
      path: { uuid: string };
    };
    responses: { 200: Schemas.ProjectRead; 422: Schemas.HTTPValidationError };
  };
  export type delete_Delete_project_api_v1_project__uuid__delete = {
    method: "DELETE";
    path: "/api/v1/project/{uuid}";
    requestFormat: "json";
    responseFormat: "json";
    parameters: {
      path: { uuid: string };
    };
    responses: { 200: unknown; 422: Schemas.HTTPValidationError };
  };
  export type get_List_files_api_v1_files__project_uuid__get = {
    method: "GET";
    path: "/api/v1/files/{project_uuid}";
    requestFormat: "json";
    responseFormat: "json";
    parameters: {
      path: { project_uuid: string };
    };
    responses: { 200: Array<Schemas.FileReadWithPaperCount>; 422: Schemas.HTTPValidationError };
  };
  export type post_Process_csv_api_v1_files_upload_post = {
    method: "POST";
    path: "/api/v1/files/upload";
    requestFormat: "form-data";
    responseFormat: "json";
    parameters: {
      body: Schemas.Body_process_csv_api_v1_files_upload_post;
    };
    responses: { 200: Record<string, unknown>; 422: Schemas.HTTPValidationError };
  };
  export type post_Process_pdfs_api_v1_files_upload_pdfs_post = {
    method: "POST";
    path: "/api/v1/files/upload-pdfs";
    requestFormat: "form-data";
    responseFormat: "json";
    parameters: {
      body: Schemas.Body_process_pdfs_api_v1_files_upload_pdfs_post;
    };
    responses: { 200: Record<string, unknown>; 422: Schemas.HTTPValidationError };
  };
  export type post_Attach_pdf_to_paper_api_v1_files__paper_uuid__attach_pdf_post = {
    method: "POST";
    path: "/api/v1/files/{paper_uuid}/attach-pdf";
    requestFormat: "form-data";
    responseFormat: "json";
    parameters: {
      path: { paper_uuid: string };

      body: Schemas.Body_attach_pdf_to_paper_api_v1_files__paper_uuid__attach_pdf_post;
    };
    responses: { 200: Schemas.PaperRead; 422: Schemas.HTTPValidationError };
  };
  export type post_Import_fulltext_api_v1_files_import_fulltext_post = {
    method: "POST";
    path: "/api/v1/files/import-fulltext";
    requestFormat: "form-data";
    responseFormat: "json";
    parameters: {
      body: Schemas.Body_import_fulltext_api_v1_files_import_fulltext_post;
    };
    responses: { 200: Schemas.FulltextImportResult; 422: Schemas.HTTPValidationError };
  };
  export type get_Download_file_api_v1_files__file_uuid__download_get = {
    method: "GET";
    path: "/api/v1/files/{file_uuid}/download";
    requestFormat: "json";
    responseFormat: "json";
    parameters: {
      path: { file_uuid: string };
    };
    responses: { 200: unknown; 422: Schemas.HTTPValidationError };
  };
  export type get_Get_jobs_api_v1_job_get = {
    method: "GET";
    path: "/api/v1/job";
    requestFormat: "json";
    responseFormat: "json";
    parameters: {
      query?: Partial<{ project: string | null }>;
    };
    responses: { 200: Array<Schemas.JobReadWithStats>; 422: Schemas.HTTPValidationError };
  };
  export type post_Create_job_api_v1_job_post = {
    method: "POST";
    path: "/api/v1/job";
    requestFormat: "json";
    responseFormat: "json";
    parameters: {
      body: Schemas.JobCreateRequest;
    };
    responses: { 201: unknown; 422: Schemas.HTTPValidationError };
  };
  export type get_Get_single_job_api_v1_job__uuid__get = {
    method: "GET";
    path: "/api/v1/job/{uuid}";
    requestFormat: "json";
    responseFormat: "json";
    parameters: {
      path: { uuid: string };
    };
    responses: { 200: Schemas.JobRead; 422: Schemas.HTTPValidationError };
  };
  export type delete_Delete_job_api_v1_job__uuid__delete = {
    method: "DELETE";
    path: "/api/v1/job/{uuid}";
    requestFormat: "json";
    responseFormat: "json";
    parameters: {
      path: { uuid: string };
    };
    responses: { 200: unknown; 422: Schemas.HTTPValidationError };
  };
  export type post_Cancel_job_api_v1_job__uuid__cancel_post = {
    method: "POST";
    path: "/api/v1/job/{uuid}/cancel";
    requestFormat: "json";
    responseFormat: "json";
    parameters: {
      path: { uuid: string };
    };
    responses: { 200: unknown; 422: Schemas.HTTPValidationError };
  };
  export type get_Get_job_tasks_api_v1_jobtask__uuid__get = {
    method: "GET";
    path: "/api/v1/jobtask/{uuid}";
    requestFormat: "json";
    responseFormat: "json";
    parameters: {
      path: { uuid: string };
    };
    responses: { 200: Array<Schemas.JobTaskRead>; 422: Schemas.HTTPValidationError };
  };
  export type patch_Add_job_task_human_result_api_v1_jobtask__uuid__patch = {
    method: "PATCH";
    path: "/api/v1/jobtask/{uuid}";
    requestFormat: "json";
    responseFormat: "json";
    parameters: {
      path: { uuid: string };

      body: Schemas.JobTaskHumanResultUpdate;
    };
    responses: { 200: unknown; 422: Schemas.HTTPValidationError };
  };
  export type get_Get_job_tasks_by_paper_api_v1_jobtask_get = {
    method: "GET";
    path: "/api/v1/jobtask";
    requestFormat: "json";
    responseFormat: "json";
    parameters: {
      query: { paper_uuid: string };
    };
    responses: { 200: Array<Schemas.JobTaskReadWithLLMConfig>; 422: Schemas.HTTPValidationError };
  };
  export type get_Get_papers_api_v1_paper__project_uuid__get = {
    method: "GET";
    path: "/api/v1/paper/{project_uuid}";
    requestFormat: "json";
    responseFormat: "json";
    parameters: {
      path: { project_uuid: string };
    };
    responses: { 200: unknown; 422: Schemas.HTTPValidationError };
  };
  export type get_Get_project_papers_with_model_evals_api_v1_paper__project_uuid__with_model_evaluations_get = {
    method: "GET";
    path: "/api/v1/paper/{project_uuid}/with_model_evaluations";
    requestFormat: "json";
    responseFormat: "json";
    parameters: {
      path: { project_uuid: string };
    };
    responses: { 200: unknown; 422: Schemas.HTTPValidationError };
  };
  export type get_Download_missing_fulltext_ris_api_v1_paper__project_uuid__missing_fulltext_ris_get = {
    method: "GET";
    path: "/api/v1/paper/{project_uuid}/missing_fulltext_ris";
    requestFormat: "json";
    responseFormat: "json";
    parameters: {
      path: { project_uuid: string };
    };
    responses: { 200: unknown; 422: Schemas.HTTPValidationError };
  };
  export type patch_Add_paper_human_result_api_v1_paper__uuid__patch = {
    method: "PATCH";
    path: "/api/v1/paper/{uuid}";
    requestFormat: "json";
    responseFormat: "json";
    parameters: {
      path: { uuid: string };

      body: Schemas.PaperHumanResultUpdate;
    };
    responses: { 200: unknown; 422: Schemas.HTTPValidationError };
  };
  export type get_Get_setting_api_v1_setting_get = {
    method: "GET";
    path: "/api/v1/setting";
    requestFormat: "json";
    responseFormat: "json";
    parameters: {
      query: { name: string };
    };
    responses: { 200: unknown; 422: Schemas.HTTPValidationError };
  };
  export type delete_Delete_setting_api_v1_setting_delete = {
    method: "DELETE";
    path: "/api/v1/setting";
    requestFormat: "json";
    responseFormat: "json";
    parameters: {
      query: { name: string };
    };
    responses: { 200: unknown; 422: Schemas.HTTPValidationError };
  };
  export type post_Upsert_setting_api_v1_setting_post = {
    method: "POST";
    path: "/api/v1/setting";
    requestFormat: "json";
    responseFormat: "json";
    parameters: {
      body: Schemas.UpsertData;
    };
    responses: { 201: unknown; 422: Schemas.HTTPValidationError };
  };
  export type get_Get_providers_api_v1_llm_providers_get = {
    method: "GET";
    path: "/api/v1/llm/providers";
    requestFormat: "json";
    responseFormat: "json";
    parameters: never;
    responses: { 200: Array<Schemas.Provider> };
  };
  export type get_Get_provider_config_params_api_v1_llm_provider_config_params_get = {
    method: "GET";
    path: "/api/v1/llm/provider_config_params";
    requestFormat: "json";
    responseFormat: "json";
    parameters: never;
    responses: { 200: Record<string, Schemas.ProviderConfigParamsResponse> };
  };
  export type post_Get_available_models_api_v1_llm__provider__models_post = {
    method: "POST";
    path: "/api/v1/llm/{provider}/models";
    requestFormat: "json";
    responseFormat: "json";
    parameters: {
      path: { provider: string };

      body: Record<string, unknown> | null;
    };
    responses: { 200: unknown; 422: Schemas.HTTPValidationError };
  };
  export type get_Download_result_csv_api_v1_result_download_result_csv_get = {
    method: "GET";
    path: "/api/v1/result/download_result_csv";
    requestFormat: "json";
    responseFormat: "json";
    parameters: {
      query: { project_uuid: string; screening_target: Schemas.ScreeningTarget };
    };
    responses: { 200: unknown; 422: Schemas.HTTPValidationError };
  };
  export type get_Download_result_html_api_v1_result_html_get = {
    method: "GET";
    path: "/api/v1/result/html";
    requestFormat: "json";
    responseFormat: "json";
    parameters: {
      query: { project_uuid: string; screening_target: Schemas.ScreeningTarget };
    };
    responses: { 200: unknown; 422: Schemas.HTTPValidationError };
  };
  export type get_Get_per_criteria_stats_api_v1_result_per_criteria_stats_get = {
    method: "GET";
    path: "/api/v1/result/per_criteria_stats";
    requestFormat: "json";
    responseFormat: "json";
    parameters: {
      query: { project_uuid: string };
    };
    responses: { 200: unknown; 422: Schemas.HTTPValidationError };
  };
  export type get_Get_result_api_v1_result__get = {
    method: "GET";
    path: "/api/v1/result/";
    requestFormat: "json";
    responseFormat: "json";
    parameters: {
      query: { project_uuid: string };
    };
    responses: { 200: unknown; 422: Schemas.HTTPValidationError };
  };
  export type get_Event_bus_api_v1_event_queue_get = {
    method: "GET";
    path: "/api/v1/event-queue";
    requestFormat: "json";
    responseFormat: "json";
    parameters: never;
    responses: { 200: unknown };
  };
  export type get_Login_api_v1_auth_login_get = {
    method: "GET";
    path: "/api/v1/auth/login";
    requestFormat: "json";
    responseFormat: "json";
    parameters: never;
    responses: { 200: unknown };
  };
  export type get_Callback_api_v1_auth_callback_get = {
    method: "GET";
    path: "/api/v1/auth/callback";
    requestFormat: "json";
    responseFormat: "json";
    parameters: never;
    responses: { 200: unknown };
  };
  export type post_Accept_consent_api_v1_auth_consent_post = {
    method: "POST";
    path: "/api/v1/auth/consent";
    requestFormat: "json";
    responseFormat: "json";
    parameters: {
      body: Schemas.ConsentAccept;
    };
    responses: { 201: Schemas.UserRead; 422: Schemas.HTTPValidationError };
  };
  export type get_Dev_login_api_v1_auth_dev_login_get = {
    method: "GET";
    path: "/api/v1/auth/dev-login";
    requestFormat: "json";
    responseFormat: "json";
    parameters: {
      query?: Partial<{ worker: string | null }>;
    };
    responses: { 200: unknown; 422: Schemas.HTTPValidationError };
  };
  export type get_Me_api_v1_auth_me_get = {
    method: "GET";
    path: "/api/v1/auth/me";
    requestFormat: "json";
    responseFormat: "json";
    parameters: never;
    responses: { 200: Schemas.UserRead };
  };
  export type delete_Delete_account_api_v1_auth_me_delete = {
    method: "DELETE";
    path: "/api/v1/auth/me";
    requestFormat: "json";
    responseFormat: "json";
    parameters: never;
    responses: { 200: unknown };
  };
  export type patch_Update_research_consent_api_v1_auth_me_research_consent_patch = {
    method: "PATCH";
    path: "/api/v1/auth/me/research-consent";
    requestFormat: "json";
    responseFormat: "json";
    parameters: {
      body: Schemas.ResearchConsentUpdate;
    };
    responses: { 200: Schemas.UserRead; 422: Schemas.HTTPValidationError };
  };
  export type get_Logout_api_v1_auth_logout_get = {
    method: "GET";
    path: "/api/v1/auth/logout";
    requestFormat: "json";
    responseFormat: "json";
    parameters: never;
    responses: { 200: unknown };
  };
  export type get_Privacy_policy_page_register_and_privacy_policy_get = {
    method: "GET";
    path: "/register-and-privacy-policy";
    requestFormat: "json";
    responseFormat: "json";
    parameters: never;
    responses: { 200: unknown };
  };
  export type get_Terms_and_conditions_page_terms_and_conditions_get = {
    method: "GET";
    path: "/terms-and-conditions";
    requestFormat: "json";
    responseFormat: "json";
    parameters: never;
    responses: { 200: unknown };
  };
  export type get_Login_page_login_get = {
    method: "GET";
    path: "/login";
    requestFormat: "json";
    responseFormat: "json";
    parameters: never;
    responses: { 200: string };
  };

  // </Endpoints>
}

// <EndpointByMethod>
export type EndpointByMethod = {
  post: {
    "/api/v1/run-test-task": Endpoints.post_Run_test_task_api_v1_run_test_task_post;
    "/api/v1/project": Endpoints.post_Create_new_project_api_v1_project_post;
    "/api/v1/files/upload": Endpoints.post_Process_csv_api_v1_files_upload_post;
    "/api/v1/files/upload-pdfs": Endpoints.post_Process_pdfs_api_v1_files_upload_pdfs_post;
    "/api/v1/files/{paper_uuid}/attach-pdf": Endpoints.post_Attach_pdf_to_paper_api_v1_files__paper_uuid__attach_pdf_post;
    "/api/v1/files/import-fulltext": Endpoints.post_Import_fulltext_api_v1_files_import_fulltext_post;
    "/api/v1/job": Endpoints.post_Create_job_api_v1_job_post;
    "/api/v1/job/{uuid}/cancel": Endpoints.post_Cancel_job_api_v1_job__uuid__cancel_post;
    "/api/v1/setting": Endpoints.post_Upsert_setting_api_v1_setting_post;
    "/api/v1/llm/{provider}/models": Endpoints.post_Get_available_models_api_v1_llm__provider__models_post;
    "/api/v1/auth/consent": Endpoints.post_Accept_consent_api_v1_auth_consent_post;
  };
  get: {
    "/api/v1/task-status/{task_id}": Endpoints.get_Get_task_status_api_v1_task_status__task_id__get;
    "/api/v1/health": Endpoints.get_Health_check_api_v1_health_get;
    "/api/v1/project": Endpoints.get_List_projects_api_v1_project_get;
    "/api/v1/project/{uuid}": Endpoints.get_Get_project_api_v1_project__uuid__get;
    "/api/v1/files/{project_uuid}": Endpoints.get_List_files_api_v1_files__project_uuid__get;
    "/api/v1/files/{file_uuid}/download": Endpoints.get_Download_file_api_v1_files__file_uuid__download_get;
    "/api/v1/job": Endpoints.get_Get_jobs_api_v1_job_get;
    "/api/v1/job/{uuid}": Endpoints.get_Get_single_job_api_v1_job__uuid__get;
    "/api/v1/jobtask/{uuid}": Endpoints.get_Get_job_tasks_api_v1_jobtask__uuid__get;
    "/api/v1/jobtask": Endpoints.get_Get_job_tasks_by_paper_api_v1_jobtask_get;
    "/api/v1/paper/{project_uuid}": Endpoints.get_Get_papers_api_v1_paper__project_uuid__get;
    "/api/v1/paper/{project_uuid}/with_model_evaluations": Endpoints.get_Get_project_papers_with_model_evals_api_v1_paper__project_uuid__with_model_evaluations_get;
    "/api/v1/paper/{project_uuid}/missing_fulltext_ris": Endpoints.get_Download_missing_fulltext_ris_api_v1_paper__project_uuid__missing_fulltext_ris_get;
    "/api/v1/setting": Endpoints.get_Get_setting_api_v1_setting_get;
    "/api/v1/llm/providers": Endpoints.get_Get_providers_api_v1_llm_providers_get;
    "/api/v1/llm/provider_config_params": Endpoints.get_Get_provider_config_params_api_v1_llm_provider_config_params_get;
    "/api/v1/result/download_result_csv": Endpoints.get_Download_result_csv_api_v1_result_download_result_csv_get;
    "/api/v1/result/html": Endpoints.get_Download_result_html_api_v1_result_html_get;
    "/api/v1/result/per_criteria_stats": Endpoints.get_Get_per_criteria_stats_api_v1_result_per_criteria_stats_get;
    "/api/v1/result/": Endpoints.get_Get_result_api_v1_result__get;
    "/api/v1/event-queue": Endpoints.get_Event_bus_api_v1_event_queue_get;
    "/api/v1/auth/login": Endpoints.get_Login_api_v1_auth_login_get;
    "/api/v1/auth/callback": Endpoints.get_Callback_api_v1_auth_callback_get;
    "/api/v1/auth/dev-login": Endpoints.get_Dev_login_api_v1_auth_dev_login_get;
    "/api/v1/auth/me": Endpoints.get_Me_api_v1_auth_me_get;
    "/api/v1/auth/logout": Endpoints.get_Logout_api_v1_auth_logout_get;
    "/register-and-privacy-policy": Endpoints.get_Privacy_policy_page_register_and_privacy_policy_get;
    "/terms-and-conditions": Endpoints.get_Terms_and_conditions_page_terms_and_conditions_get;
    "/login": Endpoints.get_Login_page_login_get;
  };
  delete: {
    "/api/v1/project/{uuid}": Endpoints.delete_Delete_project_api_v1_project__uuid__delete;
    "/api/v1/job/{uuid}": Endpoints.delete_Delete_job_api_v1_job__uuid__delete;
    "/api/v1/setting": Endpoints.delete_Delete_setting_api_v1_setting_delete;
    "/api/v1/auth/me": Endpoints.delete_Delete_account_api_v1_auth_me_delete;
  };
  patch: {
    "/api/v1/jobtask/{uuid}": Endpoints.patch_Add_job_task_human_result_api_v1_jobtask__uuid__patch;
    "/api/v1/paper/{uuid}": Endpoints.patch_Add_paper_human_result_api_v1_paper__uuid__patch;
    "/api/v1/auth/me/research-consent": Endpoints.patch_Update_research_consent_api_v1_auth_me_research_consent_patch;
  };
};

// </EndpointByMethod>

// <EndpointByMethod.Shorthands>
export type PostEndpoints = EndpointByMethod["post"];
export type GetEndpoints = EndpointByMethod["get"];
export type DeleteEndpoints = EndpointByMethod["delete"];
export type PatchEndpoints = EndpointByMethod["patch"];
// </EndpointByMethod.Shorthands>
