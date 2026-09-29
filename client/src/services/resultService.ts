import { api } from "../services/api";

import { PerCriteriaStatsResponse } from "../state/types";

export const fetchResultFromBackend = async (projectUuid: string) => {
  return await api.get("/api/v1/result/", {
    query: { project_uuid: projectUuid },
  });
};

export const fetchPerCriteriaStats = async (
  projectUuid: string,
): Promise<PerCriteriaStatsResponse> => {
  return await api.get("/api/v1/result/per_criteria_stats", {
    query: { project_uuid: projectUuid },
  });
};
