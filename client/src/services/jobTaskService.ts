import { api } from '../services/api';
import { JobTaskHumanResult, ScreeningTask } from '../state/types';

export const fetchPapersFromBackend = async (projectUuid: string) => {
  try {
    const res = await api.get(`/paper/${projectUuid}`);
    return res.data;
  } catch (error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = error as any
    if (e.response?.status === 404) {
      return [];
    }
    throw error;
  }
};

export const fetchJobTasksFromBackend = async (jobUuid: string, jobId?: number) => {
  try {
    const res = await api.get(`/jobtask/${jobUuid}`);
    let id = jobId;
    if (!id && res.data.length > 0) {
      id = res.data[0].job_id;
    }
    return res.data.map((task: ScreeningTask) => ({
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
    const res = await api.get(`/jobtask/${jobTaskUuid}`);
    return res.data;
  } catch (error) {
    console.error("Error fetching job task by UUID:", error);
    throw error;
  }
};

export const addJobTaskResult = async (jobTaskUuid: string, result: JobTaskHumanResult) => {
  try {
  const res = await api.patch(`/jobtask/${jobTaskUuid}`, { human_result: result });
  return res.data;
  } catch (error) {
    console.error("Error adding job task result:", error);
    throw error;
  }
};
