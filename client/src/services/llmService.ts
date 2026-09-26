import { api } from "./api";

export const retrieve_models = async (
  provider: string,
  provider_parameters: Record<string, unknown> = {},
): Promise<Array<{ id: string; created: number; object: "model"; owned_by: string }>> => {
  try {
    const res = await api.post("/api/v1/llm/{provider}/models", {
      path: { provider },
      body: { provider_parameters },
    });
    return res;
  } catch (error) {
    console.error("Fetching models unsuccessful", error);
    throw error;
  }
};
