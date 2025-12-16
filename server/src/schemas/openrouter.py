from typing import Any, List, Optional
from pydantic import BaseModel


class Architecture(BaseModel):
    modality: str
    input_modalities: List[str]
    output_modalities: List[str]
    tokenizer: str
    instruct_type: Optional[str]


class Pricing(BaseModel):
    prompt: str
    completion: str
    request: Optional[str] = None
    image: Optional[str] = None
    audio: Optional[str] = None
    web_search: Optional[str] = None
    internal_reasoning: Optional[str] = None
    input_cache_read: Optional[str] = None
    input_cache_write: Optional[str] = None


class TopProvider(BaseModel):
    context_length: Optional[int]
    max_completion_tokens: Optional[int]
    is_moderated: bool


class Datum(BaseModel):
    id: str
    canonical_slug: str
    hugging_face_id: Optional[str]
    name: str
    created: int
    description: str
    context_length: int
    architecture: Architecture
    pricing: Pricing
    top_provider: TopProvider
    per_request_limits: Any
    supported_parameters: List[str]


class OpenrouterModelResponse(BaseModel):
    data: List[Datum]
