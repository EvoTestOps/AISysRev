from abc import ABC, abstractmethod
from typing import ClassVar, List, Literal, Optional, Type, TypeVar, Union
from pydantic import BaseModel, Field

from src.schemas.llm import ProviderRuntimeConfiguration

T = TypeVar("T", bound=BaseModel)


class BaseLLMParams(BaseModel):
    temperature: float = Field(
        default=0.0,
        title="Temperature",
        description="Controls the generated text's randomness.",
        ge=0.0,
        le=1.0,
    )
    seed: int = Field(
        default=128,
        title="Seed",
        description="The seed parameter is a numerical value used to ensure the reproducibility of text output.",
    )
    top_p: float = Field(
        default=0.1,
        title="top_p",
        description="Nucleus sampling. Controls the diversity of the generated text.",
        ge=0.0,
        le=1.0,
    )


class ConfigParameter(BaseModel):
    """
    Config parameter is something that the provider needs (e.g. API key or certain config) that must be provided via the AiSysRev UI.
    """

    key: str
    title: str
    type: Literal["string", "number", "boolean"] = "string"
    defaultValue: Optional[Union[str, int, float, bool]] = None
    secret: bool = True


class LLMProvider(ABC):
    from openai.types.model import Model

    # ---------- CLASS METADATA ----------
    provider_name: ClassVar[str]
    provider_title: ClassVar[str]
    provider_description: ClassVar[str]
    provider_model_parameters: ClassVar[type[BaseModel]]
    provider_config_parameters: ClassVar[list[ConfigParameter]]
    api_key_config_parameter: ClassVar[ConfigParameter | None] = None

    # ---------- INSTANCE ----------
    def __init__(self, runtime_config: ProviderRuntimeConfiguration):
        self._config = runtime_config

    @property
    def config(self) -> ProviderRuntimeConfiguration:
        return self._config

    # ---------- RUNTIME BEHAVIOR ----------
    @abstractmethod
    async def get_available_models(self) -> List["Model"]:
        pass

    @abstractmethod
    async def generate_answer_async(
        self,
        configuration: BaseLLMParams,
        schema: Type[T],
        prompt: str,
    ) -> tuple[T, str]:
        pass


class Provider(BaseModel):
    name: str
    title: str
    description: str
    model_parameters: dict
    config_parameters: list[ConfigParameter]
