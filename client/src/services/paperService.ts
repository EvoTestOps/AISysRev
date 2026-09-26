import { api } from "../services/api";
import { TypedStatusError } from "../services/api/client";
import { JobTaskHumanResult } from "../state/types";

export const fetchPapersForProject = async (projectUuid: string) => {
  try {
    return await api.get("/api/v1/paper/{project_uuid}", { path: { project_uuid: projectUuid } });
  } catch (error: unknown) {
    // TODO: Do not return empty list for HTTP 404
    if (error instanceof TypedStatusError && error.status === 404) {
      return [];
    }
    throw error;
  }
};

export const fetchPapersWithModelEvalsForProject = async (projectUuid: string) => {
  try {
    return await api.get("/api/v1/paper/{project_uuid}/with_model_evaluations", {
      path: { project_uuid: projectUuid },
    });
  } catch (error: unknown) {
    // TODO: Do not return empty list for HTTP 404
    if (error instanceof TypedStatusError && error.status === 404) {
      return [];
    }
    throw error;
  }
};

export const addPaperHumanResult = async (paperUuid: string, result: JobTaskHumanResult) => {
  try {
    return await api.patch("/api/v1/paper/{uuid}", {
      path: { uuid: paperUuid },
      body: { human_result: result },
    });
  } catch (error) {
    console.error("Error adding human result to paper:", error);
    throw error;
  }
};
