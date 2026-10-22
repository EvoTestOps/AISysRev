import importlib

import pytest
from pydantic import ValidationError

import src.core.llm.providers as providers_module
from src.core.config import settings
from src.core.llm.providers.local_openai_sdk import (
    LocalOpenAISDKProvider,
    LocalOpenAISDKProviderParams,
)

pytestmark = pytest.mark.unit


@pytest.mark.parametrize(
    "base_url, expected",
    [
        ("http://host.docker.internal:1234/v1", "http://host.docker.internal:1234/v1"),
        ("https://llm.example.com/v1", "https://llm.example.com/v1"),
        ("  http://localhost:8080/v1  ", "http://localhost:8080/v1"),
        ("HTTP://localhost/v1", "http://localhost/v1"),
        ("http://localhost/v1?foo=bar#frag", "http://localhost/v1"),
    ],
)
def test_base_url_accepts_http_and_https(base_url: str, expected: str):
    params = LocalOpenAISDKProviderParams(base_url=base_url)
    assert params.base_url == expected


@pytest.mark.parametrize(
    "base_url",
    [
        "",
        "localhost:1234/v1",
        "ftp://localhost/v1",
        "file:///etc/passwd",
        "javascript:alert(1)",
        "http://",
        "http:///v1",
        "http://user:pass@localhost/v1",
        "http://localhost:notaport/v1",
        "http://localhost:99999/v1",
    ],
)
def test_base_url_rejects_invalid_urls(base_url: str):
    with pytest.raises(ValidationError):
        LocalOpenAISDKProviderParams(base_url=base_url)


@pytest.mark.parametrize(
    "app_env, enabled",
    [
        ("dev", True),
        ("test", True),
        ("staging", False),
        ("production", False),
        ("prod", False),
    ],
)
def test_provider_enabled_only_outside_hosted_envs(
    monkeypatch: pytest.MonkeyPatch, app_env: str, enabled: bool
):
    monkeypatch.setattr(settings, "APP_ENV", app_env)
    try:
        reloaded = importlib.reload(providers_module)
        assert (LocalOpenAISDKProvider in reloaded.llm_providers) is enabled
    finally:
        monkeypatch.undo()
        importlib.reload(providers_module)
