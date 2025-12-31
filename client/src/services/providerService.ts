import { ProviderResponse } from "../state/types";
import { api } from "./api";

export const fetchProviders = async () => {
  try {
    const res = await api.get(`/llm/providers`);
    const parsed = ProviderResponse.parse(res.data);
    return parsed;
  } catch (error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = error as any;
    // TODO: Do not return empty list for HTTP 404
    if (e.response?.status === 404) {
      return [];
    }
    throw error;
  }
};
