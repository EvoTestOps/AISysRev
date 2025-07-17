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
    console.log("Job created successfully:", res.data);
    return res.data;
  } catch (error) {
    console.error("Error creating job:", error);
    throw error;
  }
};