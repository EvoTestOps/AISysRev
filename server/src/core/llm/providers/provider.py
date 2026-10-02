from abc import ABC, abstractmethod
from typing import Any, ClassVar, Generic, List, Literal, Optional, Type, TypeVar, Union

from httpx2 import AsyncClient
from pydantic import BaseModel, Field

from src.schemas.llm import (
    JevStructuredResponse,
    ProviderRuntimeParameters,
    StructuredResponse,
)

T = TypeVar("T", bound=BaseModel)


class BaseLLMParams(BaseModel):
    temperature: float = Field(
        default=0,
        title="Temperature",
        description="Controls the generated text's randomness.",
        ge=0.0,
        le=1.0,
    )
    # seed: int = Field(
    #     default=128,
    #     title="Seed",
    #     description="The seed parameter is a numerical value used to ensure the reproducibility of text output.",
    # )
    top_p: float = Field(
        default=0.1,
        title="top_p",
        description="Nucleus sampling. Controls the diversity of the generated text.",
        ge=0.1,
        le=1.0,
    )


class ConfigParameter(BaseModel):
    """
    Config parameter is something that the provider needs (e.g. API key or certain config) that must be provided via the AISysRev UI.
    """

    key: str
    title: str
    description: Optional[str] = None
    type: Literal["string", "number", "boolean"] = "string"
    defaultValue: Optional[Union[str, int, float, bool]] = None
    secret: bool = True


P = TypeVar("P", bound=BaseModel)
M = TypeVar("M", bound=BaseModel)


class LLMProvider(Generic[P, M], ABC):
    from openai.types.model import Model

    # Provider-specific
    provider_name: ClassVar[str]
    provider_title: ClassVar[str]
    provider_description: ClassVar[str]

    provider_parameters_schema: ClassVar[type[P] | None] = None  # type: ignore

    # Model-specific
    model_parameters_schema: ClassVar[type[M]]  # type: ignore

    # Response schema requested for zero-shot / few-shot screening.
    structured_response_schema: ClassVar[
        type[StructuredResponse | JevStructuredResponse]
    ] = StructuredResponse
    # Whether the PER_CRITERIA screening type (one call per criterion) can be used.
    supports_per_criteria: ClassVar[bool] = True

    # Config-specific - e.g. what needs to be configured in the UI.
    config_parameters: ClassVar[list[ConfigParameter]]
    api_key_config_parameter: ClassVar[ConfigParameter | None] = None

    def __init__(
        self,
        provider_parameters: dict[str, Any],
        runtime_parameters: ProviderRuntimeParameters,
    ):
        self._runtime_parameters = runtime_parameters
        if self.provider_parameters_schema is not None:
            self._provider_parameters: P = (
                self.provider_parameters_schema.model_validate(provider_parameters)
            )
        else:
            self._provider_parameters = None  # type: ignore

    def parse_model_parameters(self, data: dict[str, Any]) -> M:
        return self.model_parameters_schema.model_validate(data)

    @property
    def runtime_parameters(self) -> ProviderRuntimeParameters:
        return self._runtime_parameters

    @property
    def provider_parameters(self) -> P | None:
        return self._provider_parameters

    @abstractmethod
    async def get_available_models(self) -> List["Model"]:
        pass

    @abstractmethod
    async def generate_answer_async(
        self,
        client: AsyncClient,
        model_parameters: dict[str, Any],
        schema: Type[T],
        prompt: str,
    ) -> T:
        pass

    async def embed_async(
        self,
        client: AsyncClient,
        texts: list[str],
    ) -> list[list[float]]:
        raise RuntimeError(f"{self.provider_name} does not support embeddings")

    @classmethod
    def global_config_parameters(cls) -> list[ConfigParameter]:
        """
        The user's global (non-secret) config_parameters passed to
        apply_global_config_overrides. Defaults to this provider's own;
        a provider sharing another provider's settings can return those.
        """
        return [
            param
            for param in cls.config_parameters
            if param is not cls.api_key_config_parameter and not param.secret
        ]

    @classmethod
    def apply_global_config_overrides(
        cls, provider_parameters: dict[str, Any], global_config: dict[str, str]
    ) -> dict[str, Any]:
        """
        Hook for providers to let a user's global (non-secret) config_parameters
        override per-job provider_parameters, e.g. forcing ZDR on regardless of
        what a specific job requested. Default: no-op.
        """
        return provider_parameters


class Provider(BaseModel):
    name: str
    title: str
    description: str
    provider_parameters_json_schema: Optional[dict] = None
    model_parameters_json_schema: dict
    config_parameters: list[ConfigParameter]
    # The setting holding the provider's API key; may belong to another
    # provider (Jev uses OpenRouter's key).
    api_key_config_parameter: Optional[ConfigParameter] = None
    supports_per_criteria: bool = True
