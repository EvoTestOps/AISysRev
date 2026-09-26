import { api } from "../services/api";
import { LlmConfig, PromptingConfig, JobScreeningMode, JobWithStats } from "../state/types";

export const createJob = async (
  projectUuid: string,
  llmConfig: LlmConfig,
  promptingConfig: PromptingConfig,
  screeningMode: JobScreeningMode,
) => {
  try {
    const res = await api.post("/api/v1/job", {
      body: {
        project_uuid: projectUuid,
        llm_config: llmConfig,
        prompting_config: promptingConfig,
        screening_mode: screeningMode,
      },
    });
    // console.log("Job created successfully:", res);
    return res;
  } catch (error) {
    console.error("Error creating job:", error);
    throw error;
  }
};

export const fetchJobsForProject = async (projectUuid: string) => {
  try {
    const res = await api.get("/api/v1/job", { query: { project: projectUuid } });
    return res as unknown as JobWithStats[];
  } catch (error) {
    console.error("Error fetching jobs:", error);
    throw error;
  }
};

export const cancelJob = async (jobUuid: string) => {
  try {
    return await api.post("/api/v1/job/{uuid}/cancel", { path: { uuid: jobUuid } });
  } catch (error) {
    console.error("Canceling task unsuccessful:", error);
    throw error;
  }
};

export const deleteJob = async (jobUuid: string) => {
  try {
    return await api.delete("/api/v1/job/{uuid}", { path: { uuid: jobUuid } });
  } catch (error) {
    console.error("Task deletion unsuccessful:", error);
    throw error;
  }
}
