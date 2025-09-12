import { api } from '../services/api';
import { JobTaskHumanResult } from '../state/types';

export const fetchPapersForProject = async (projectUuid: string) => {
  try {
    const res = await api.get(`/paper/${projectUuid}`);
    return res.data;
  } catch (error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = error as any
    // TODO: Do not return empty list for HTTP 404
    if (e.response?.status === 404) {
      return [];
    }
    throw error;
  }
};

export const addPaperHumanResult = async (paperUuid: string, result: JobTaskHumanResult) => {
  try {
    const res = await api.patch(`/paper/${paperUuid}`, { human_result: result });
    return res.data;
  } catch (error) {
    console.error("Error adding human result to paper:", error);
    throw error;
  }
};