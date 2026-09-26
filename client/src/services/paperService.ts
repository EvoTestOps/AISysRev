import { AxiosError } from "axios";
import { legacyApi } from "../services/api";
import { JobTaskHumanResult } from "../state/types";

export const fetchPapersForProject = async (projectUuid: string) => {
  try {
    const res = await legacyApi.get(`/api/v1/paper/${projectUuid}`);
    return res.data;
  } catch (error: unknown) {
    const e = error as AxiosError;
    // TODO: Do not return empty list for HTTP 404
    if (e.response?.status === 404) {
      return [];
    }
    throw error;
  }
};

export const fetchPapersWithModelEvalsForProject = async (projectUuid: string) => {
  try {
    const res = await legacyApi.get(`/api/v1/paper/${projectUuid}/with_model_evaluations`);
    return res.data;
  } catch (error: unknown) {
    const e = error as AxiosError;
    // TODO: Do not return empty list for HTTP 404
    if (e.response?.status === 404) {
      return [];
    }
    throw error;
  }
};

export const addPaperHumanResult = async (paperUuid: string, result: JobTaskHumanResult) => {
  try {
    const res = await legacyApi.patch(`/api/v1/paper/${paperUuid}`, {
      human_result: result,
    });
    return res.data;
  } catch (error) {
    console.error("Error adding human result to paper:", error);
    throw error;
  }
};
