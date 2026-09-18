from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from src.core.llm.providers.openrouter import (
    OpenRouterProvider,
    OpenRouterProviderParams,
)
from src.schemas.llm import ProviderRuntimeParameters
from src.schemas.setting import SettingRead
from src.services.llm_service import LLMService


@pytest.mark.unit
def test_zdr_defaults_to_false():
    params = OpenRouterProviderParams.model_validate({})
    assert params.zdr is False


@pytest.mark.unit
def test_zdr_can_be_enabled():
    params = OpenRouterProviderParams.model_validate({"zdr": True})
    assert params.zdr is True


def _make_provider(zdr: bool) -> OpenRouterProvider:
    return OpenRouterProvider(
        provider_parameters={"zdr": zdr},
        runtime_config=ProviderRuntimeParameters(model="openai/gpt-4o", api_key="k"),
    )


@pytest.mark.unit
def test_build_openrouter_provider_settings_omits_zdr_when_disabled():
    provider = _make_provider(zdr=False)
    settings = provider._build_openrouter_provider_settings()
    assert "zdr" not in settings
    assert settings["data_collection"] == "deny"


@pytest.mark.unit
def test_build_openrouter_provider_settings_sets_zdr_when_enabled():
    provider = _make_provider(zdr=True)
    settings = provider._build_openrouter_provider_settings()
    assert settings["zdr"] is True


@pytest.mark.unit
@pytest.mark.asyncio
async def test_embed_async_omits_provider_when_zdr_disabled():
    provider = _make_provider(zdr=False)

    mock_response = MagicMock()
    mock_response.data = [MagicMock(embedding=[0.1, 0.2])]
    mock_client = MagicMock()
    mock_client.embeddings.create = AsyncMock(return_value=mock_response)

    with patch("openai.AsyncOpenAI", return_value=mock_client):
        result = await provider.embed_async(client=MagicMock(), texts=["hello"])

    assert result == [[0.1, 0.2]]
    _, kwargs = mock_client.embeddings.create.call_args
    assert kwargs["extra_body"] is None


@pytest.mark.unit
@pytest.mark.asyncio
async def test_embed_async_sets_zdr_provider_when_enabled():
    provider = _make_provider(zdr=True)

    mock_response = MagicMock()
    mock_response.data = [MagicMock(embedding=[0.1, 0.2])]
    mock_client = MagicMock()
    mock_client.embeddings.create = AsyncMock(return_value=mock_response)

    with patch("openai.AsyncOpenAI", return_value=mock_client):
        await provider.embed_async(client=MagicMock(), texts=["hello"])

    _, kwargs = mock_client.embeddings.create.call_args
    assert kwargs["extra_body"] == {"provider": {"zdr": True}}


class _MockResponse:
    def __init__(self, body: dict):
        self._body = body

    async def json(self):
        return self._body

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False


class _MockSession:
    def __init__(self, body: dict):
        self._body = body
        self.requested_urls: list[str] = []

    def get(self, url, headers=None):
        self.requested_urls.append(url)
        return _MockResponse(self._body)

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False


@pytest.mark.unit
@pytest.mark.asyncio
async def test_get_available_models_uses_models_endpoint_when_zdr_disabled():
    provider = _make_provider(zdr=False)
    session = _MockSession(
        {
            "data": [
                {
                    "id": "openai/gpt-4o",
                    "created": 123,
                    "canonical_slug": "openai/gpt-4o",
                }
            ]
        }
    )

    with patch("aiohttp.ClientSession", return_value=session):
        models = await provider.get_available_models()

    assert [m.id for m in models] == ["openai/gpt-4o"]
    assert "endpoints/zdr" not in session.requested_urls[0]


@pytest.mark.unit
@pytest.mark.asyncio
async def test_get_available_models_uses_zdr_endpoint_and_filters_when_enabled():
    provider = _make_provider(zdr=True)
    session = _MockSession(
        {
            "data": [
                {
                    "model_id": "openai/gpt-4o",
                    "provider_name": "OpenAI",
                    "supported_parameters": [
                        "structured_outputs",
                        "response_format",
                        "temperature",
                        "top_p",
                    ],
                },
                # Duplicate endpoint for the same model from another provider.
                {
                    "model_id": "openai/gpt-4o",
                    "provider_name": "Azure",
                    "supported_parameters": [
                        "structured_outputs",
                        "response_format",
                        "temperature",
                        "top_p",
                    ],
                },
                # Missing a required parameter -> should be filtered out.
                {
                    "model_id": "some/other-model",
                    "provider_name": "Other",
                    "supported_parameters": ["temperature"],
                },
            ]
        }
    )

    with patch("aiohttp.ClientSession", return_value=session):
        models = await provider.get_available_models()

    assert [m.id for m in models] == ["openai/gpt-4o"]
    assert "endpoints/zdr" in session.requested_urls[0]


@pytest.mark.unit
def test_apply_global_config_overrides_forces_zdr_when_setting_is_true():
    result = OpenRouterProvider.apply_global_config_overrides(
        {"zdr": False}, {"openrouter_force_zdr": "true"}
    )
    assert result == {"zdr": True}


@pytest.mark.unit
def test_apply_global_config_overrides_leaves_params_untouched_when_not_set():
    result = OpenRouterProvider.apply_global_config_overrides(
        {"zdr": False}, {}
    )
    assert result == {"zdr": False}


@pytest.mark.unit
@pytest.mark.asyncio
async def test_resolve_provider_parameters_applies_force_zdr_override():
    owner_uuid = uuid4()
    setting_service = MagicMock()

    async def fake_get_setting(key, owner_uuid, mask_secret=False):
        if key == "openrouter_force_zdr":
            return SettingRead(name=key, value="true", secret=False)
        return None

    setting_service.get_setting = AsyncMock(side_effect=fake_get_setting)
    llm_service = LLMService(setting_service)

    result = await llm_service.resolve_provider_parameters(
        OpenRouterProvider, {"zdr": False}, owner_uuid
    )

    assert result == {"zdr": True}
    # The secret api_key config parameter must never be read through this path.
    called_keys = [call.args[0] for call in setting_service.get_setting.await_args_list]
    assert "openrouter_api_key" not in called_keys


@pytest.mark.unit
@pytest.mark.asyncio
async def test_resolve_provider_parameters_no_override_when_setting_missing():
    owner_uuid = uuid4()
    setting_service = MagicMock()
    setting_service.get_setting = AsyncMock(return_value=None)
    llm_service = LLMService(setting_service)

    result = await llm_service.resolve_provider_parameters(
        OpenRouterProvider, {"zdr": False}, owner_uuid
    )

    assert result == {"zdr": False}
