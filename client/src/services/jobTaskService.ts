import { api } from "../services/api";
import { TypedStatusError } from "../services/api/client";
import { JobTaskHumanResult } from "../state/types";

export const fetchPapersFromBackend = async (projectUuid: string) => {
  try {
    return await api.get("/api/v1/paper/{project_uuid}", { path: { project_uuid: projectUuid } });
  } catch (error: unknown) {
    if (error instanceof TypedStatusError && error.status === 404) {
      return [];
    }
    throw error;
  }
};

export const fetchJobTasksFromBackend = async (jobUuid: string, jobId?: number) => {
  try {
    const res = await api.get("/api/v1/jobtask/{uuid}", { path: { uuid: jobUuid } });
    let id = jobId;
    if (!id && res.length > 0) {
      id = res[0].job_id;
    }
    return res.map((task) => ({
      ...task,
      job_uuid: jobUuid,
    }));
  } catch (error) {
    console.error("Error fetching job tasks:", error);
    throw error;
  }
};

export const fetchJobTaskByUuid = async (jobTaskUuid: string) => {
  try {
    return await api.get("/api/v1/jobtask/{uuid}", { path: { uuid: jobTaskUuid } });
  } catch (error) {
    console.error("Error fetching job task by UUID:", error);
    throw error;
  }
};

export const addJobTaskResult = async (jobTaskUuid: string, result: JobTaskHumanResult) => {
  try {
    return await api.patch("/api/v1/jobtask/{uuid}", {
      path: { uuid: jobTaskUuid },
      body: { human_result: result },
    });
  } catch (error) {
    console.error("Error adding job task result:", error);
    throw error;
  }
};
