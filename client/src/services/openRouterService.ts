import { z } from "zod";
import axios from "axios";

const prefix = "/api/v1";

// OpenRouter API model listing response schema
// Backend filters this list to show only the ones that support JSON, temperature, seed and top_p.
const ArchitectureSchema = z.object({
  modality: z.string(),
  input_modalities: z.array(z.string()),
  output_modalities: z.array(z.string()),
  tokenizer: z.string(),
  instruct_type: z.string().nullable(),
});

const PricingSchema = z.object({
  prompt: z.string(),
  completion: z.string(),
  request: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  audio: z.string().nullable().optional(),
  web_search: z.string().nullable().optional(),
  internal_reasoning: z.string().nullable().optional(),
  input_cache_read: z.string().nullable().optional(),
  input_cache_write: z.string().nullable().optional(),
});

const TopProviderSchema = z.object({
  context_length: z.number().int().nullable(),
  max_completion_tokens: z.number().int().nullable(),
  is_moderated: z.boolean(),
});

const DatumSchema = z.object({
  id: z.string(),
  canonical_slug: z.string(),
  hugging_face_id: z.string().nullable(),
  name: z.string(),
  created: z.number().int(),
  description: z.string(),
  context_length: z.number().int(),
  architecture: ArchitectureSchema,
  pricing: PricingSchema,
  top_provider: TopProviderSchema,
  per_request_limits: z.any(),
  supported_parameters: z.array(z.string()),
});

export const schema = z.object({
  data: z.array(DatumSchema),
});

export type ModelResponse = z.TypeOf<typeof schema>;

export const retrieve_models = async () => {
  try {
    const res = await axios.get(`${prefix}/openrouter/models`);
    console.log("Fetching models successful", res.data);
    const parsed = schema.parse(res.data);
    return parsed.data;
  } catch (error) {
    console.log("Fetching models unsuccessful", error);
    throw error;
  }
};
