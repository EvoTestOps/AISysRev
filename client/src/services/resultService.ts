import { api } from '../services/api'

export const fetchResultFromBackend = async (projectUuid: string) => {
  const res = await api.get(`/result/?project_uuid=${projectUuid}`);
  return res.data;
};
