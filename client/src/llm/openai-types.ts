export interface Root {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Choice[];
  usage: Usage;
  system_fingerprint: string;
}

export interface Choice {
  index: number;
  message: Message;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logprobs: any;
  finish_reason: string;
}

export interface Message {
  role: string;
  content: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  refusal: any;
}

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  prompt_tokens_details: PromptTokensDetails;
  completion_tokens_details: CompletionTokensDetails;
}

export interface PromptTokensDetails {
  cached_tokens: number;
}

export interface CompletionTokensDetails {
  reasoning_tokens: number;
  accepted_prediction_tokens: number;
  rejected_prediction_tokens: number;
}
