import { api } from "../services/api";
import { LlmConfig, PromptingConfig } from "../state/types";

export const createJob = async (
  projectUuid: string,
  llmConfig: LlmConfig,
  promptingConfig: PromptingConfig
) => {
  try {
    const res = await api.post("/job", {
      project_uuid: projectUuid,
      llm_config: llmConfig,
      prompting_config: promptingConfig,
    });
    console.log("Job created successfully:", res.data);
    return res.data;
  } catch (error) {
    console.error("Error creating job:", error);
    throw error;
  }
};

export const fetchJobsForProject = async (projectUuid: string) => {
  try {
    const res = await api.get(`/job?project=${projectUuid}`);
    return res.data;
  } catch (error) {
    console.error("Error fetching jobs:", error);
    throw error;
  }
};
