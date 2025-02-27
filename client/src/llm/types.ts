import { z } from "zod";

export type Criteria = {
  id: number;
  criteria: string;
};

type Left<T> = {
  result: T;
};

type Right = {
  error: string;
};

export function left<T>(result: T): Left<T> {
  return {
    result,
  };
}

export function right(error: string): Right {
  return {
    error,
  };
}

export function isLeft<T>(x: unknown): x is Left<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const y = x as any;
  return "result" in y;
}

export type Either<T> = Left<T> | Right;

const Model = z.object({
  id: z.string(),
  object: z.string(),
  created: z.number(),
  owned_by: z.string(),
});

export type Model = z.infer<typeof Model>;

export const available_models = {
  "gpt-3.5-turbo": "openai/gpt-3.5-turbo",
  "gpt-4o-mini": "openai/gpt-4o-mini",
  "chatgpt-4o": "openai/chatgpt-4o-latest",
  "claude-3.5-sonnet": "anthropic/claude-3.5-sonnet",
  mistral: "mistralai/ministral-8b",
} as const;

export const default_model = available_models["gpt-4o-mini"];

const ModelName = z.enum([
  available_models["gpt-3.5-turbo"],
  available_models["gpt-4o-mini"],
  available_models["chatgpt-4o"],
  available_models["claude-3.5-sonnet"],
  available_models["mistral"],
]);

export type ModelName = z.infer<typeof ModelName>;

const DecisionType = z.enum(["Likert", "IncludeExclude"]);

export type DecisionType = z.infer<typeof DecisionType>;

export type OpenrouterResponse = {
  id: string;
  // Depending on whether you set "stream" to "true" and
  // whether you passed in "messages" or a "prompt", you
  // will get a different output shape
  choices: (NonStreamingChoice | StreamingChoice | NonChatChoice)[];
  created: number; // Unix timestamp
  model: string;
  object: "chat.completion" | "chat.completion.chunk";

  system_fingerprint?: string; // Only present if the provider supports it

  // Usage data is always returned for non-streaming.
  // When streaming, you will get one usage object at
  // the end accompanied by an empty choices array.
  usage?: ResponseUsage;
};

type ResponseUsage = {
  /** Including images and tools if any */
  prompt_tokens: number;
  /** The tokens generated */
  completion_tokens: number;
  /** Sum of the above two fields */
  total_tokens: number;
};

// Subtypes:
type NonChatChoice = {
  finish_reason: string | null;
  text: string;
  error?: ErrorResponse;
};

type NonStreamingChoice = {
  finish_reason: string | null; // Depends on the model. Ex: 'stop' | 'length' | 'content_filter' | 'tool_calls'
  message: {
    content: string | null;
    role: string;
    tool_calls?: ToolCall[];
  };
  error?: ErrorResponse;
};

type StreamingChoice = {
  finish_reason: string | null;
  delta: {
    content: string | null;
    role?: string;
    tool_calls?: ToolCall[];
  };
  error?: ErrorResponse;
};

type ErrorResponse = {
  code: number; // See "Error Handling" section
  message: string;
  metadata?: Record<string, unknown>; // Contains additional error information such as provider details, the raw error message, etc.
};

type ToolCall = {
  id: string;
  type: "function";
  function: FunctionCall;
};

type FunctionCall = unknown;
