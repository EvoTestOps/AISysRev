import { api } from "../services/api";

export const fetchResultFromBackend = async (projectUuid: string) => {
  const res = await api.get(
    `/result/?${new URLSearchParams({ project_uuid: projectUuid }).toString()}`
  );
  return res.data;
};
