"""Startup checks in src/tools/diagnostics.

These only print and raise, so the tests check what they print and that they
re-raise. `check_database_connection` needs the real database.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from botocore.exceptions import ClientError
from sqlalchemy.exc import OperationalError

from src.core.config import settings
from src.tools.diagnostics import celery_check, db_check, redis_check, storage_check
from src.worker import celery_app

pytestmark = pytest.mark.asyncio


def _client_error(code: str) -> ClientError:
    return ClientError({"Error": {"Code": code, "Message": code}}, "HeadBucket")


# --- storage_check ----------------------------------------------------------


@pytest.mark.unit
async def test_local_storage_check_reports_the_storage_path(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
):
    monkeypatch.setattr(settings, "STORAGE_BACKEND", "local")
    monkeypatch.setattr(settings, "PDF_STORAGE_PATH", "/data/pdfs")

    with patch.object(storage_check, "_client") as client:
        await storage_check.check_storage_backend()

    assert "Storage backend: local (/data/pdfs)" in capsys.readouterr().out
    client.assert_not_called()


@pytest.fixture
def s3_settings(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "STORAGE_BACKEND", "s3")
    monkeypatch.setattr(settings, "S3_BUCKET", "the-bucket")
    monkeypatch.setattr(settings, "S3_ENDPOINT_URL", "http://minio:9000")


@pytest.mark.unit
async def test_s3_storage_check_passes_when_the_bucket_exists(
    s3_settings, capsys: pytest.CaptureFixture[str]
):
    client = MagicMock()

    with patch.object(storage_check, "_client", return_value=client):
        await storage_check.check_storage_backend()

    client.head_bucket.assert_called_once_with(Bucket="the-bucket")
    client.create_bucket.assert_not_called()
    assert (
        "Storage backend: s3 (http://minio:9000, bucket=the-bucket)"
        in capsys.readouterr().out
    )


@pytest.mark.unit
async def test_s3_storage_check_creates_a_missing_bucket(s3_settings):
    client = MagicMock()
    client.head_bucket.side_effect = _client_error("404")

    with patch.object(storage_check, "_client", return_value=client):
        await storage_check.check_storage_backend()

    client.create_bucket.assert_called_once_with(Bucket="the-bucket")


@pytest.mark.unit
async def test_s3_storage_check_fails_on_other_errors(
    s3_settings, capsys: pytest.CaptureFixture[str]
):
    client = MagicMock()
    client.head_bucket.side_effect = _client_error("403")

    with patch.object(storage_check, "_client", return_value=client):
        with pytest.raises(ClientError):
            await storage_check.check_storage_backend()

    client.create_bucket.assert_not_called()
    assert "Storage backend check failed" in capsys.readouterr().out


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
    capsys: pytest.CaptureFixture[str],
):
    client = _redis_client(ping=True)

    with patch.object(redis_check.redis, "from_url", return_value=client) as make:
        await redis_check.check_redis_connection()

    make.assert_called_once_with(settings.REDIS_URL, decode_responses=True)
    assert "Redis connection OK" in capsys.readouterr().out
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
    capsys: pytest.CaptureFixture[str],
):
    client = _redis_client(ping=OSError("connection refused"))

    with patch.object(redis_check.redis, "from_url", return_value=client):
        with pytest.raises(OSError, match="connection refused"):
            await redis_check.check_redis_connection()

    assert "Redis connection failed: connection refused" in capsys.readouterr().out
    client.close.assert_awaited_once()


# --- celery_check -----------------------------------------------------------


@pytest.mark.unit
async def test_celery_check_passes_when_a_worker_answers(
    capsys: pytest.CaptureFixture[str],
):
    with patch.object(
        celery_app.control, "ping", return_value=[{"worker@host": {"ok": "pong"}}]
    ) as ping:
        await celery_check.check_celery_worker()

    ping.assert_called_once_with(timeout=2)
    assert "Celery worker connection OK" in capsys.readouterr().out


@pytest.mark.unit
@pytest.mark.parametrize("answer", [[], None])
async def test_celery_check_fails_when_no_worker_answers(answer):
    with patch.object(celery_app.control, "ping", return_value=answer):
        with pytest.raises(ConnectionError, match="No Celery workers responded"):
            await celery_check.check_celery_worker()


@pytest.mark.unit
async def test_celery_check_reraises_broker_errors(
    capsys: pytest.CaptureFixture[str],
):
    with patch.object(celery_app.control, "ping", side_effect=OSError("no broker")):
        with pytest.raises(OSError, match="no broker"):
            await celery_check.check_celery_worker()

    assert "Celery worker connection failed: no broker" in capsys.readouterr().out


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
async def test_wait_for_db_gives_up_after_three_attempts():
    check = AsyncMock(side_effect=Exception("down"))

    with patch.object(db_check, "check_database_connection", check):
        with patch.object(db_check.asyncio, "sleep", AsyncMock()):
            with pytest.raises(Exception, match="Database failed to become ready"):
                await db_check.wait_for_db()

    assert check.await_count == 3


# This one uses the real engine, so it needs the database (backend-test job)


async def test_database_check_succeeds_against_the_test_database(
    capsys: pytest.CaptureFixture[str],
):
    rows = await db_check.check_database_connection()

    assert rows == [(1,)]
    assert "Database check successful." in capsys.readouterr().out


@pytest.mark.unit
async def test_database_check_returns_none_when_the_connection_fails(
    capsys: pytest.CaptureFixture[str],
):
    engine = MagicMock()
    engine.connect.side_effect = OperationalError("SELECT 1", {}, Exception("refused"))

    with patch.object(db_check, "engine", engine):
        rows = await db_check.check_database_connection()

    assert rows is None
    assert "Database connection failed" in capsys.readouterr().out
