import axios from 'axios';

const prefix = '/api/v1';

export const createJob = async (projectUuid: string, llmConfig: {
    model_name: string;
    temperature: number;
    seed: number;
    top_p: number;
}) => {
  try {
    const res = await axios.post(`${prefix}/job`, {
      project_uuid: projectUuid,
      llm_config: {
        model_name: llmConfig.model_name,
        temperature: llmConfig.temperature,
        seed: llmConfig.seed,
        top_p: llmConfig.top_p
      }
    });
    return res.data;
  } catch (error) {
    console.error("Error creating job:", error);
    throw error;
  }
};

export const fetchJobsForProject = async (projectUuid: string) => {
  try {
    const res = await axios.get(`${prefix}/job?project=${projectUuid}`);
    return res.data;
  } catch (error) {
    console.error("Error fetching jobs:", error);
    throw error;
  }
};

export const fetchJobTasksFromBackend = async (jobUuid: string) => {
  try {
    const res = await axios.get(`${prefix}/jobtask/${jobUuid}`);
    return res.data;
  } catch (error) {
    console.error("Error fetching job tasks:", error);
    console.error("Request URL:", `${prefix}/jobtask/${jobUuid}`);
    throw error;
  }
};
