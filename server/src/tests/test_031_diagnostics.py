"""Startup checks in src/tools/diagnostics.

These only log and raise, so the tests check what they log and that they
re-raise. `check_database_connection` needs the real database.
"""

import logging
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from botocore.exceptions import ClientError
from sqlalchemy.exc import OperationalError

from src.core.config import settings
from src.tools.diagnostics import celery_check, db_check, redis_check, storage_check
from src.worker import celery_app

pytestmark = pytest.mark.asyncio


@pytest.fixture(autouse=True)
def capture_info_logs(caplog: pytest.LogCaptureFixture):
    # The root logger is at WARNING in the tests, which would drop the INFO messages
    caplog.set_level(logging.INFO)


def _client_error(code: str) -> ClientError:
    return ClientError({"Error": {"Code": code, "Message": code}}, "HeadBucket")


# --- storage_check ----------------------------------------------------------


@pytest.mark.unit
async def test_local_storage_check_reports_the_storage_path(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
):
    monkeypatch.setattr(settings, "STORAGE_BACKEND", "local")
    monkeypatch.setattr(settings, "PDF_STORAGE_PATH", "/data/pdfs")

    with patch.object(storage_check, "_client") as client:
        await storage_check.check_storage_backend()

    assert "Storage backend: local (/data/pdfs)" in caplog.text
    client.assert_not_called()


@pytest.fixture
def s3_settings(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "STORAGE_BACKEND", "s3")
    monkeypatch.setattr(settings, "S3_BUCKET", "the-bucket")
    monkeypatch.setattr(settings, "S3_ENDPOINT_URL", "http://minio:9000")


@pytest.mark.unit
async def test_s3_storage_check_passes_when_the_bucket_exists(
    s3_settings, caplog: pytest.LogCaptureFixture
):
    client = MagicMock()

    with patch.object(storage_check, "_client", return_value=client):
        await storage_check.check_storage_backend()

    client.head_bucket.assert_called_once_with(Bucket="the-bucket")
    client.create_bucket.assert_not_called()
    assert "Storage backend: s3 (http://minio:9000, bucket=the-bucket)" in caplog.text


@pytest.mark.unit
async def test_s3_storage_check_creates_a_missing_bucket(s3_settings):
    client = MagicMock()
    client.head_bucket.side_effect = _client_error("404")

    with patch.object(storage_check, "_client", return_value=client):
        await storage_check.check_storage_backend()

    client.create_bucket.assert_called_once_with(Bucket="the-bucket")


@pytest.mark.unit
async def test_s3_storage_check_fails_on_other_errors(
    s3_settings, caplog: pytest.LogCaptureFixture
):
    client = MagicMock()
    client.head_bucket.side_effect = _client_error("403")

    with patch.object(storage_check, "_client", return_value=client):
        with pytest.raises(ClientError):
            await storage_check.check_storage_backend()

    client.create_bucket.assert_not_called()
    assert "Storage backend check failed" in caplog.text


# --- redis_check ------------------------------------------------------------


def _redis_client(ping=True):
    client = MagicMock()
    client.ping = (
        AsyncMock(side_effect=ping)
        if isinstance(ping, Exception)
        else (AsyncMock(return_value=ping))
    )
    client.close = AsyncMock()
    return client


@pytest.mark.unit
async def test_redis_check_reports_a_working_connection(
    caplog: pytest.LogCaptureFixture,
):
    client = _redis_client(ping=True)

    with patch.object(redis_check.redis, "from_url", return_value=client) as make:
        await redis_check.check_redis_connection()

    make.assert_called_once_with(settings.REDIS_URL, decode_responses=True)
    assert "Redis connection OK" in caplog.text
    client.close.assert_awaited_once()


@pytest.mark.unit
async def test_redis_check_fails_when_ping_is_not_answered():
    client = _redis_client(ping=False)

    with patch.object(redis_check.redis, "from_url", return_value=client):
        with pytest.raises(ConnectionError, match="Redis ping failed"):
            await redis_check.check_redis_connection()

    client.close.assert_awaited_once()


@pytest.mark.unit
async def test_redis_check_reraises_connection_errors_and_still_closes(
    caplog: pytest.LogCaptureFixture,
):
    client = _redis_client(ping=OSError("connection refused"))

    with patch.object(redis_check.redis, "from_url", return_value=client):
        with pytest.raises(OSError, match="connection refused"):
            await redis_check.check_redis_connection()

    assert "Redis connection failed: connection refused" in caplog.text
    client.close.assert_awaited_once()


# --- celery_check -----------------------------------------------------------


@pytest.mark.unit
async def test_celery_check_passes_when_a_worker_answers(
    caplog: pytest.LogCaptureFixture,
):
    with patch.object(
        celery_app.control, "ping", return_value=[{"worker@host": {"ok": "pong"}}]
    ) as ping:
        await celery_check.check_celery_worker()

    ping.assert_called_once_with(timeout=2)
    assert "Celery worker connection OK" in caplog.text


@pytest.mark.unit
@pytest.mark.parametrize("answer", [[], None])
async def test_celery_check_fails_when_no_worker_answers(answer):
    with patch.object(celery_app.control, "ping", return_value=answer):
        with pytest.raises(ConnectionError, match="No Celery workers responded"):
            await celery_check.check_celery_worker()


@pytest.mark.unit
async def test_celery_check_reraises_broker_errors(
    caplog: pytest.LogCaptureFixture,
):
    with patch.object(celery_app.control, "ping", side_effect=OSError("no broker")):
        with pytest.raises(OSError, match="no broker"):
            await celery_check.check_celery_worker()

    assert "Celery worker connection failed: no broker" in caplog.text


# --- db_check ---------------------------------------------------------------


@pytest.mark.unit
async def test_wait_for_db_returns_as_soon_as_the_database_answers():
    check = AsyncMock(side_effect=[[(1,)]])

    with patch.object(db_check, "check_database_connection", check):
        with patch.object(db_check.asyncio, "sleep", AsyncMock()) as sleep:
            await db_check.wait_for_db()

    assert check.await_count == 1
    sleep.assert_not_awaited()


@pytest.mark.unit
async def test_wait_for_db_retries_with_growing_delays():
    check = AsyncMock(side_effect=[Exception("down"), Exception("down"), [(1,)]])

    with patch.object(db_check, "check_database_connection", check):
        with patch.object(db_check.asyncio, "sleep", AsyncMock()) as sleep:
            await db_check.wait_for_db()

    assert check.await_count == 3
    assert [c.args[0] for c in sleep.await_args_list] == [1, 2]


@pytest.mark.unit
async def test_wait_for_db_gives_up_after_attempts():
    check = AsyncMock(side_effect=Exception("down"))

    with patch.object(db_check, "check_database_connection", check):
        with patch.object(db_check.asyncio, "sleep", AsyncMock()):
            with pytest.raises(Exception, match="Database failed to become ready"):
                await db_check.wait_for_db()

    assert check.await_count == 5


# This one uses the real engine, so it needs the database (backend-test job)


async def test_database_check_succeeds_against_the_test_database(
    caplog: pytest.LogCaptureFixture,
):
    rows = await db_check.check_database_connection()

    assert rows == [(1,)]
    assert "Database check successful." in caplog.text


@pytest.mark.unit
async def test_database_check_reraises_when_the_connection_fails(
    caplog: pytest.LogCaptureFixture,
):
    session = AsyncMock()
    session.execute.side_effect = OperationalError("SELECT 1", {}, Exception("refused"))
    session_factory = MagicMock()
    session_factory.return_value.__aenter__.return_value = session

    with patch.object(db_check, "AsyncSessionLocal", session_factory):
        with pytest.raises(OperationalError):
            await db_check.check_database_connection()

    assert "Database connection failed" in caplog.text


# This one needs the database too (backend-test job)


async def test_max_connections_check_reads_the_test_databases_limit(
    caplog: pytest.LogCaptureFixture,
):
    max_connections = await db_check.check_max_connections()

    assert max_connections is not None and max_connections > 0
    assert f"PostgreSQL max_connections: {max_connections}" in caplog.text


@pytest.mark.unit
async def test_max_connections_check_warns_when_the_pool_can_use_every_connection(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
):
    monkeypatch.setattr(settings, "DB_POOL_SIZE", 10)
    monkeypatch.setattr(settings, "DB_POOL_MAX_OVERFLOW", 10)
    session = AsyncMock()
    session.execute.return_value = MagicMock(scalar_one=MagicMock(return_value="15"))
    session_factory = MagicMock()
    session_factory.return_value.__aenter__.return_value = session

    with patch.object(db_check, "AsyncSessionLocal", session_factory):
        max_connections = await db_check.check_max_connections()

    assert max_connections == 15
    assert (
        "PostgreSQL max_connections: 15 (this API process pools up to 20)"
        in caplog.text
    )
    assert any(r.levelno == logging.WARNING for r in caplog.records)


@pytest.mark.unit
async def test_max_connections_check_does_not_fail_the_startup(
    caplog: pytest.LogCaptureFixture,
):
    session = AsyncMock()
    session.execute.side_effect = OperationalError(
        "SHOW max_connections", {}, Exception("refused")
    )
    session_factory = MagicMock()
    session_factory.return_value.__aenter__.return_value = session

    with patch.object(db_check, "AsyncSessionLocal", session_factory):
        assert await db_check.check_max_connections() is None

    assert "Could not read max_connections" in caplog.text
