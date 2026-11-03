import z from "zod";
import { ScreeningTarget } from "../state/types";
import {
  Prompt,
  PromptCreate,
  PromptDetail,
  PromptDetailModel,
  PromptModel,
  PromptText,
  PromptVariables,
} from "../state/types/prompt";
import { api } from "./api";
import { PromptVariablesResponse, TypedStatusError } from "./api/client";

/** The built-in prompts and the user's own, the built-in ones first. */
export const fetchPrompts = async (
  screeningTarget?: ScreeningTarget,
  signal?: AbortSignal,
): Promise<Prompt[]> => {
  const res = await api.get("/api/v1/prompt", {
    query: { screening_target: screeningTarget },
    overrides: { signal },
  });
  return z.array(PromptModel).parse(res);
};

export const fetchPrompt = async (uuid: string): Promise<PromptDetail> => {
  const res = await api.get("/api/v1/prompt/{uuid}", { path: { uuid } });
  return PromptDetailModel.parse(res);
};

export const fetchPromptVariables = async (): Promise<PromptVariables> => {
  const res = await api.get("/api/v1/prompt/variables");
  return PromptVariablesResponse.parse(res);
};

export const createPrompt = async (body: PromptCreate): Promise<PromptDetail> => {
  const res = await api.post("/api/v1/prompt", { body });
  return PromptDetailModel.parse(res);
};

/** Saves the text as the prompt's next version (unless it is unchanged). */
export const savePromptVersion = async (uuid: string, body: PromptText): Promise<PromptDetail> => {
  const res = await api.post("/api/v1/prompt/{uuid}/version", { path: { uuid }, body });
  return PromptDetailModel.parse(res);
};

export const deletePrompt = async (uuid: string) => {
  await api.delete("/api/v1/prompt/{uuid}", { path: { uuid } });
};

/** The server's reason for a failed request, for a toast. */
export const promptErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof TypedStatusError) {
    const detail = (error.response.data as { detail?: unknown } | undefined)?.detail;
    if (typeof detail === "string") {
      return detail;
    }
    if (Array.isArray(detail)) {
      return detail
        .map((e: { msg?: string }) => (e.msg ?? "").replace(/^Value error, /, ""))
        .join("\n");
    }
  }
  return fallback;
};
