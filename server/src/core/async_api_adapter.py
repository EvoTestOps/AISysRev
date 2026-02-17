"""
Async API infrastructure for parallel LLM and embedding calls.

Ported from AISysRevCmdLine/async_api.py and adapted for AISysRev web app:
- Replaces tqdm progress with Celery task.update_state()
- Integrates with existing LLMProvider abstraction
- Publishes progress events via Redis for frontend SSE

Two parallel stacks:
1) pydantic_ai Agent stack (httpx-based) - for classification calls
2) aiohttp stack - for embedding calls to /embeddings endpoint
"""

import asyncio
import logging
import random
from typing import Any, Awaitable, Callable, Iterable, List, Optional, TypeVar

import aiohttp
import httpx
from httpx import AsyncClient, HTTPStatusError, Response
from pydantic_ai import Agent
from pydantic_ai.models.openrouter import OpenRouterModel, OpenRouterModelSettings
from pydantic_ai.providers.openrouter import OpenRouterProvider
from pydantic_ai.retries import AsyncTenacityTransport, RetryConfig, wait_retry_after
from tenacity import retry_if_exception_type, stop_after_attempt, wait_exponential_jitter

logger = logging.getLogger(__name__)

T = TypeVar("T")

# --- Constants ---

RETRYABLE_STATUSES: set[int] = {429, 502, 503, 504}
PERMANENT_ERROR_STATUSES: set[int] = {400, 401, 403, 404, 405, 422}
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


# --- httpx retry client (for pydantic_ai Agent) ---


async def log_response(response: Response) -> None:
    """Log retryable HTTP errors (429, 502-504)."""
    if response.status_code in RETRYABLE_STATUSES:
        logger.error(
            "Retryable status %s for %s %s",
            response.status_code,
            response.request.method,
            str(response.request.url),
        )


def create_retrying_client(
    *,
    max_wait_seconds: float = 300,
    max_attempts: int = 6,
    retryable_statuses: Iterable[int] = RETRYABLE_STATUSES,
    timeout: httpx.Timeout | None = httpx.Timeout(120.0),
) -> AsyncClient:
    """
    Build an httpx AsyncClient with automatic retry on rate-limit and server errors.
    Uses tenacity exponential backoff with retry-after header support.
    """
    retryable = set(retryable_statuses)

    def validate_response(response: Response) -> None:
        if response.status_code in retryable:
            response.raise_for_status()

    transport = AsyncTenacityTransport(
        config=RetryConfig(
            retry=retry_if_exception_type((HTTPStatusError, ConnectionError)),
            wait=wait_retry_after(
                fallback_strategy=wait_exponential_jitter(
                    initial=1, max=max_wait_seconds, jitter=5
                ),
                max_wait=max_wait_seconds,
            ),
            stop=stop_after_attempt(max_attempts),
            reraise=True,
        ),
        validate_response=validate_response,
    )
    return AsyncClient(
        transport=transport,
        timeout=timeout,
        event_hooks={"response": [log_response]},
    )


# Module-level singleton client for all pydantic_ai Agent calls
client = create_retrying_client()


# --- Agent factory ---


def create_agent(
    model_name: str,
    api_key: str,
    *,
    system_prompt: str = "",
    output_type: Any,
    retries: int = 3,
    output_retries: int = 5,
) -> Agent:
    """
    Create a pydantic_ai Agent configured for an OpenRouter model with
    deterministic settings (temperature=0, top_p=0.1) and structured output.
    """
    settings = OpenRouterModelSettings(
        extra_headers={
            "X-Title": "AISysRev",
            "HTTP-Referer": "https://github.com/EvoTestOps/AISysRev",
        },
        temperature=0,
        top_p=0.1,
    )
    model = OpenRouterModel(
        model_name,
        provider=OpenRouterProvider(api_key=api_key, http_client=client),
        settings=settings,
    )
    return Agent(
        model,
        system_prompt=system_prompt,
        retries=retries,
        output_retries=output_retries,
        output_type=output_type,
    )


# --- Permanent error detection ---


def _is_permanent_error(exc: Exception) -> bool:
    """Check if an error is permanent (not worth retrying other calls)."""
    error_str = str(exc)
    for status in PERMANENT_ERROR_STATUSES:
        if f"status_code: {status}" in error_str:
            return True
    return False


# --- pydantic_ai Agent concurrency orchestration ---


async def _call_agent(
    prompt: str,
    agent: Agent,
    model_name: str,
    semaphore: asyncio.Semaphore,
    error_state: dict,
    abort: asyncio.Event,
) -> Optional[Any]:
    """
    Send a single prompt to a pydantic_ai Agent, respecting concurrency semaphore.
    Tracks errors and signals abort on permanent errors.
    """
    if abort.is_set():
        return None
    async with semaphore:
        if abort.is_set():
            return None
        try:
            result = await agent.run(prompt)
            return result.output
        except Exception as e:
            error_state["count"] += 1
            if error_state["count"] == 1:
                error_state["first_error"] = str(e)
                logger.error(f"LLM call failed for model {model_name}: {e}")
                if _is_permanent_error(e):
                    abort.set()
    return None


async def process_batch_agent(
    prompts: List[str],
    agent: Agent,
    model_name: str,
    max_concurrent: int = 20,
    progress_callback: Optional[Callable[[int, int], Awaitable[None]]] = None,
) -> List[Optional[Any]]:
    """
    Process a batch of prompts through a pydantic_ai Agent with concurrency control.

    Args:
        prompts: List of prompts to process
        agent: pydantic_ai Agent instance
        model_name: Name of the model being used
        max_concurrent: Maximum concurrent requests
        progress_callback: Optional async callback(current, total) for progress updates

    Returns:
        List of parsed outputs (or None for failures) in same order as prompts
    """
    semaphore = asyncio.Semaphore(max_concurrent)
    error_state = {"count": 0, "first_error": None}
    abort = asyncio.Event()

    completed = 0
    total = len(prompts)

    async def tracked_call(prompt: str) -> Optional[Any]:
        nonlocal completed
        result = await _call_agent(prompt, agent, model_name, semaphore, error_state, abort)
        completed += 1
        if progress_callback:
            await progress_callback(completed, total)
        return result

    tasks = [tracked_call(prompt) for prompt in prompts]
    results = await asyncio.gather(*tasks)

    if abort.is_set():
        skipped = sum(1 for r in results if r is None)
        logger.warning(
            f"Permanent error for model {model_name}, skipped {skipped}/{len(prompts)} calls"
        )
    elif error_state["count"] > 1:
        logger.warning(
            f"Error repeated {error_state['count']} times for model {model_name}"
        )

    return results


async def process_all_models_agent(
    prompts: List[str],
    models: List[str],
    api_key: str,
    *,
    system_prompt: str,
    output_type: Any,
    max_concurrent_per_model: int = 20,
    progress_callback: Optional[Callable[[str, int, int], Awaitable[None]]] = None,
) -> List[List[Optional[Any]]]:
    """
    Process prompts through multiple models concurrently.

    Args:
        prompts: List of prompts to process
        models: List of model names
        api_key: OpenRouter API key
        system_prompt: System prompt for agents
        output_type: Pydantic model for structured output
        max_concurrent_per_model: Concurrent requests per model
        progress_callback: Optional async callback(model_name, current, total)

    Returns:
        List of lists: outer=models, inner=per-prompt results
    """
    logger.info(
        f"Processing {len(models)} models with {max_concurrent_per_model} "
        f"concurrent prompts per model"
    )

    model_tasks = []
    for model_name in models:
        agent = create_agent(
            model_name,
            api_key,
            system_prompt=system_prompt,
            output_type=output_type,
        )

        async def model_progress(current: int, total: int) -> None:
            if progress_callback:
                await progress_callback(model_name, current, total)

        model_tasks.append(
            process_batch_agent(
                prompts, agent, model_name, max_concurrent_per_model, model_progress
            )
        )

    return await asyncio.gather(*model_tasks)


# --- aiohttp retry (for embeddings and raw HTTP calls) ---


class PermanentAPIError(Exception):
    """Raised when the API returns a non-retryable error status code."""

    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        super().__init__(f"Permanent API error {status_code}: {message}")


async def retry_aiohttp_call(
    session: aiohttp.ClientSession,
    url: str,
    *,
    json_payload: dict,
    headers: dict[str, str],
    timeout: aiohttp.ClientTimeout = aiohttp.ClientTimeout(total=120),
    max_retries: int = 6,
    max_wait_seconds: float = 300,
) -> Optional[dict]:
    """
    Make an aiohttp POST with manual retry logic (exponential backoff for 429/5xx,
    immediate abort for permanent errors).
    """
    for attempt in range(max_retries):
        try:
            async with session.post(
                url, headers=headers, json=json_payload, timeout=timeout
            ) as response:
                if response.status in PERMANENT_ERROR_STATUSES:
                    body = await response.text()
                    raise PermanentAPIError(response.status, body)

                if response.status == 429:
                    retry_after = int(response.headers.get("Retry-After", 5))
                    jitter = random.uniform(0, 5)
                    wait = min(
                        retry_after + jitter + attempt * retry_after, max_wait_seconds
                    )
                    await asyncio.sleep(wait)
                    continue

                if response.status in {502, 503, 504}:
                    wait = min(2 ** (attempt + 1) + random.uniform(0, 5), max_wait_seconds)
                    await asyncio.sleep(wait)
                    continue

                response.raise_for_status()
                return await response.json()

        except PermanentAPIError:
            raise
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            wait = min(2 ** (attempt + 2) + random.uniform(0, 5), max_wait_seconds)
            await asyncio.sleep(wait)
    return None


async def process_batch_aiohttp(
    items: list,
    async_fn: Callable[[Any], Awaitable[Optional[T]]],
    *,
    description: str = "Processing",
    max_concurrent: int = 20,
    progress_callback: Optional[Callable[[int, int], Awaitable[None]]] = None,
) -> List[Optional[T]]:
    """
    Generic concurrency orchestrator for aiohttp-based calls with error dedup and abort.

    Args:
        items: List of items to process
        async_fn: Async function to call for each item
        description: Description for logging
        max_concurrent: Maximum concurrent requests
        progress_callback: Optional async callback(current, total) for progress

    Returns:
        List of results (or None for failures) in same order as items
    """
    semaphore = asyncio.Semaphore(max_concurrent)
    error_state = {"count": 0, "first_error": None}
    abort = asyncio.Event()

    completed = 0
    total = len(items)

    async def wrapped(item: Any) -> Optional[T]:
        nonlocal completed
        if abort.is_set():
            return None
        async with semaphore:
            if abort.is_set():
                return None
            try:
                result = await async_fn(item)
                completed += 1
                if progress_callback:
                    await progress_callback(completed, total)
                return result
            except PermanentAPIError as e:
                error_state["count"] += 1
                if error_state["count"] == 1:
                    error_state["first_error"] = str(e)
                    logger.error(f"{description} failed: {e}")
                abort.set()
                return None
            except Exception as e:
                error_state["count"] += 1
                if error_state["count"] == 1:
                    error_state["first_error"] = str(e)
                    logger.error(f"{description} failed: {e}")
                return None

    tasks = [wrapped(item) for item in items]
    results = await asyncio.gather(*tasks)

    if abort.is_set():
        skipped = sum(1 for r in results if r is None)
        logger.warning(f"Permanent error, skipped {skipped}/{len(items)} calls")
    elif error_state["count"] > 1:
        logger.warning(f"Error repeated {error_state['count']} times")

    return results


def make_openrouter_headers(api_key: str) -> dict[str, str]:
    """Build standard Authorization + Content-Type headers for OpenRouter API calls."""
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "X-Title": "AISysRev",
        "HTTP-Referer": "https://github.com/EvoTestOps/AISysRev",
    }
