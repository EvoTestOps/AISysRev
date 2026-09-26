import { ProviderResponse } from "../state/types";
import { api } from "./api";
import { TypedStatusError } from "./api/client";

export const fetchProviders = async () => {
  try {
    const res = await api.get("/api/v1/llm/providers");
    const parsed = ProviderResponse.parse(res);
    return parsed;
  } catch (error: unknown) {
    if (error instanceof TypedStatusError && error.status === 404) {
      return [];
    }
    throw error;
  }
};
