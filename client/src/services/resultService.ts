import { api } from "../services/api";

export const fetchResultFromBackend = async (projectUuid: string) => {
  const res = await api.get(
    `/api/v1/result/?${new URLSearchParams({ project_uuid: projectUuid }).toString()}`,
  );
  return res.data;
};

export type CriterionAgreementStats = {
  description: string;
  type: "inclusion" | "exclusion" | "unknown";
  n_papers: number;
  krippendorff_alpha: number | null;
  percent_agreement: number | null;
  gwet_ac1: number | null;
};

export type PerCriteriaStatsResponse = {
  n_raters: number;
  rater_job_uuids: string[];
  criteria: Record<string, CriterionAgreementStats>;
};

export const fetchPerCriteriaStats = async (
  projectUuid: string,
): Promise<PerCriteriaStatsResponse> => {
  const res = await api.get(
    `/api/v1/result/per_criteria_stats?${new URLSearchParams({ project_uuid: projectUuid }).toString()}`,
  );
  return res.data;
};
