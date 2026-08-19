import { api } from "../services/api";
import { LlmConfig, PromptingConfig, JobScreeningMode } from "../state/types";

export const createJob = async (
  projectUuid: string,
  llmConfig: LlmConfig,
  promptingConfig: PromptingConfig,
  screeningMode: JobScreeningMode,
) => {
  try {
    const res = await api.post("/api/v1/job", {
      project_uuid: projectUuid,
      llm_config: llmConfig,
      prompting_config: promptingConfig,
      screening_mode: screeningMode,
    });
    // console.log("Job created successfully:", res.data);
    return res.data;
  } catch (error) {
    console.error("Error creating job:", error);
    throw error;
  }
};

export const fetchJobsForProject = async (projectUuid: string) => {
  try {
    const res = await api.get(`/api/v1/job?project=${projectUuid}`);
    return res.data;
  } catch (error) {
    console.error("Error fetching jobs:", error);
    throw error;
  }
};

export const cancelJob = async (jobUuid: string) => {
  try {
    const res = await api.post(`/api/v1/job/${jobUuid}/cancel`);
    return res.data;
  } catch (error) {
    console.error("Canceling task unsuccessful:", error);
    throw error;
  }
};

export const deleteJob = async (jobUuid: string) => {
  try {
    const res = await api.delete(`/api/v1/job/${jobUuid}`);
    return res.data;
  } catch (error) {
    console.error("Task deletion unsuccessful:", error);
    throw error;
  }
}
