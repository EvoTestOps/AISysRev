import { AxiosError } from "axios";
import { ProviderResponse } from "../state/types";
import { legacyApi } from "./api";

export const fetchProviders = async () => {
  try {
    const res = await legacyApi.get(`/api/v1/llm/providers`);
    const parsed = ProviderResponse.parse(res.data);
    return parsed;
  } catch (error: unknown) {
    const e = error as AxiosError;
    if (e.response?.status === 404) {
      return [];
    }
    throw error;
  }
};
