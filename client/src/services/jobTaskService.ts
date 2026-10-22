import { api } from "../services/api";
import { JobTaskDetail, JobTaskRead, TypedStatusError } from "../services/api/client";
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

/** A job's tasks (one per paper), ordered by paper id. Empty when it has none. */
export const fetchJobTasks = async (
  jobUuid: string,
  signal?: AbortSignal,
): Promise<JobTaskRead[]> => {
  try {
    return await api.get("/api/v1/jobtask/{uuid}", {
      path: { uuid: jobUuid },
      overrides: { signal },
    });
  } catch (error: unknown) {
    // The endpoint answers 404 for a job without tasks.
    if (error instanceof TypedStatusError && error.status === 404) {
      return [];
    }
    throw error;
  }
};

/** One task of a job, with its result, error and the prompts sent. */
export const fetchJobTaskDetail = (
  jobUuid: string,
  taskUuid: string,
  signal?: AbortSignal,
): Promise<JobTaskDetail> =>
  api.get("/api/v1/job/{job_uuid}/task/{task_uuid}", {
    path: { job_uuid: jobUuid, task_uuid: taskUuid },
    overrides: { signal },
  });

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
