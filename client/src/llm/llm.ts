import { z } from "zod";
import { OPENROUTER_API_URL } from "../config/config";
import { Root } from "./openai-types";
import { system_prompt, system_prompt_json } from "./prompt";
import { DecisionType, Either, left, right } from "./types";

export function getSystemPrompt(
  enforceJSON: boolean,
  decisionType: DecisionType
) {
  return enforceJSON ? system_prompt_json(decisionType) : system_prompt;
}

const getResponseFormat = (enforceJSON: boolean) =>
  enforceJSON ? "json_object" : "text";

const OpenrouterErrorReponse = z.object({
  error: z.object({
    code: z.number(),
    message: z.string(),
  }),
});

export async function query_llm(
  prompt: string,
  authorizarion_token: string,
  abortController: AbortController,
  model: string,
  enforceJSON: boolean,
  temperature: number,
  seed: number,
  decisionType: DecisionType
): Promise<Either<Root>> {
  const request = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-type": "application/json",
      Authorization: `Bearer ${authorizarion_token}`,
    },
    signal: abortController.signal,
    body: JSON.stringify({
      model,
      response_format: { type: getResponseFormat(enforceJSON) },
      messages: [
        {
          role: "system",
          content: getSystemPrompt(enforceJSON, decisionType),
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature,
      seed,
    }),
  });

  if (request.ok) {
    const response = await request.json();
    // Openrouter returns HTTP200 even when there is an error
    const errorResponse = OpenrouterErrorReponse.safeParse(response);
    if (errorResponse.success) {
      return right(errorResponse.data.error.message);
    }
    return left(response);
  } else {
    const response = await request.json();
    const errorResponse = OpenrouterErrorReponse.safeParse(response);
    if (errorResponse.success) {
      return right(errorResponse.data.error.message);
    }
    return right("Unkown error. Please check console");
  }
}
