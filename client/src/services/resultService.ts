import { api } from "../services/api";

import { PerCriteriaStatsResponse } from "../state/types";

export const fetchResultFromBackend = async (projectUuid: string) => {
  const res = await api.get(
    `/api/v1/result/?${new URLSearchParams({ project_uuid: projectUuid }).toString()}`,
  );
  return res.data;
};

export const fetchPerCriteriaStats = async (
  projectUuid: string,
): Promise<PerCriteriaStatsResponse> => {
  const res = await api.get(
    `/api/v1/result/per_criteria_stats?${new URLSearchParams({ project_uuid: projectUuid }).toString()}`,
  );
  return res.data;
};
