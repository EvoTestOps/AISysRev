import { api } from "../services/api";

export const fetchResultFromBackend = async (projectUuid: string) => {
  const res = await api.get(
    `/api/v1/result/?${new URLSearchParams({ project_uuid: projectUuid }).toString()}`,
  );
  return res.data;
};
