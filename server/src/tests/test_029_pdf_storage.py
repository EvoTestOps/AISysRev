import hashlib
from pathlib import Path
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from botocore.exceptions import ClientError

from src.core.config import settings
from src.tools import pdf_storage
from src.tools.pdf_storage import (
    build_storage_path,
    delete_pdf_bytes,
    delete_project_pdf_directory,
    read_pdf_bytes,
    write_pdf_bytes,
)

pytestmark = pytest.mark.unit

PDF = b"%PDF-1.7 some content"


def _client_error(code: str) -> ClientError:
    return ClientError({"Error": {"Code": code, "Message": code}}, "Operation")


@pytest.fixture
def local_storage(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    monkeypatch.setattr(settings, "STORAGE_BACKEND", "local")
    monkeypatch.setattr(settings, "PDF_STORAGE_PATH", str(tmp_path))
    return tmp_path


@pytest.fixture
def s3_client(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "STORAGE_BACKEND", "s3")
    monkeypatch.setattr(settings, "S3_BUCKET", "test-bucket")
    client = MagicMock()
    with patch.object(pdf_storage, "_client", return_value=client):
        yield client


# --- build_storage_path -----------------------------------------------------


def test_local_path_is_under_the_storage_root_and_owner(local_storage: Path):
    owner = uuid4()

    path = build_storage_path(owner, PDF)

    digest = hashlib.sha256(PDF).hexdigest()
    assert path == f"{local_storage}/{owner}/{digest}.pdf"


def test_s3_key_has_no_storage_root(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "STORAGE_BACKEND", "s3")
    owner = uuid4()

    path = build_storage_path(owner, PDF)

    assert path == f"{owner}/{hashlib.sha256(PDF).hexdigest()}.pdf"


def test_the_path_is_deterministic_for_the_same_owner_and_content(
    local_storage: Path,
):
    owner = uuid4()

    assert build_storage_path(owner, PDF) == build_storage_path(owner, PDF)


def test_the_path_differs_by_content_and_by_owner(local_storage: Path):
    owner = uuid4()

    assert build_storage_path(owner, PDF) != build_storage_path(owner, PDF + b"x")
    assert build_storage_path(owner, PDF) != build_storage_path(uuid4(), PDF)


# --- local backend ----------------------------------------------------------


def test_local_write_then_read_round_trips(local_storage: Path):
    path = build_storage_path(uuid4(), PDF)

    write_pdf_bytes(path, PDF)

    assert read_pdf_bytes(path) == PDF


def test_local_write_creates_missing_directories(local_storage: Path):
    path = str(local_storage / "a" / "b" / "c" / "file.pdf")

    write_pdf_bytes(path, PDF)

    assert Path(path).read_bytes() == PDF


def test_local_write_overwrites_existing_content(local_storage: Path):
    path = str(local_storage / "file.pdf")
    write_pdf_bytes(path, b"old")

    write_pdf_bytes(path, b"new")

    assert read_pdf_bytes(path) == b"new"


def test_local_read_of_a_missing_file_raises(local_storage: Path):
    with pytest.raises(FileNotFoundError):
        read_pdf_bytes(str(local_storage / "missing.pdf"))


def test_local_delete_removes_the_file(local_storage: Path):
    path = str(local_storage / "file.pdf")
    write_pdf_bytes(path, PDF)

    delete_pdf_bytes(path)

    assert not Path(path).exists()


def test_local_delete_of_a_missing_file_is_not_an_error(local_storage: Path):
    delete_pdf_bytes(str(local_storage / "missing.pdf"))


def test_local_project_delete_removes_every_file_and_tolerates_missing_ones(
    local_storage: Path,
):
    paths = [str(local_storage / f"{i}.pdf") for i in range(3)]
    for p in paths[:2]:
        write_pdf_bytes(p, PDF)

    delete_project_pdf_directory(paths)

    assert not any(Path(p).exists() for p in paths)


def test_local_project_delete_with_no_paths_does_nothing(local_storage: Path):
    survivor = str(local_storage / "keep.pdf")
    write_pdf_bytes(survivor, PDF)

    delete_project_pdf_directory([])

    assert Path(survivor).exists()


# --- s3 backend -------------------------------------------------------------


def test_s3_write_uploads_when_the_object_does_not_exist(s3_client: MagicMock):
    s3_client.head_object.side_effect = _client_error("404")

    write_pdf_bytes("owner/hash.pdf", PDF)

    s3_client.put_object.assert_called_once_with(
        Bucket="test-bucket",
        Key="owner/hash.pdf",
        Body=PDF,
        ContentType="application/pdf",
    )


def test_s3_write_skips_the_upload_when_the_object_already_exists(
    s3_client: MagicMock,
):
    write_pdf_bytes("owner/hash.pdf", PDF)

    s3_client.head_object.assert_called_once_with(
        Bucket="test-bucket", Key="owner/hash.pdf"
    )
    s3_client.put_object.assert_not_called()


def test_s3_write_does_not_hide_other_errors(s3_client: MagicMock):
    s3_client.head_object.side_effect = _client_error("403")

    with pytest.raises(ClientError):
        write_pdf_bytes("owner/hash.pdf", PDF)

    s3_client.put_object.assert_not_called()


def test_s3_read_returns_the_object_body(s3_client: MagicMock):
    s3_client.get_object.return_value = {"Body": MagicMock(read=lambda: PDF)}

    assert read_pdf_bytes("owner/hash.pdf") == PDF
    s3_client.get_object.assert_called_once_with(
        Bucket="test-bucket", Key="owner/hash.pdf"
    )


@pytest.mark.parametrize("code", ["NoSuchKey", "404"])
def test_s3_read_of_a_missing_object_raises_file_not_found(
    s3_client: MagicMock, code: str
):
    s3_client.get_object.side_effect = _client_error(code)

    with pytest.raises(FileNotFoundError, match="owner/hash.pdf"):
        read_pdf_bytes("owner/hash.pdf")


def test_s3_read_does_not_hide_other_errors(s3_client: MagicMock):
    s3_client.get_object.side_effect = _client_error("AccessDenied")

    with pytest.raises(ClientError):
        read_pdf_bytes("owner/hash.pdf")


def test_s3_delete_removes_the_object(s3_client: MagicMock):
    delete_pdf_bytes("owner/hash.pdf")

    s3_client.delete_object.assert_called_once_with(
        Bucket="test-bucket", Key="owner/hash.pdf"
    )


def test_s3_project_delete_batches_keys_in_groups_of_a_thousand(s3_client: MagicMock):
    keys = [f"owner/{i}.pdf" for i in range(2500)]

    delete_project_pdf_directory(keys)

    batches = [
        call.kwargs["Delete"]["Objects"] for call in s3_client.delete_objects.mock_calls
    ]
    assert [len(b) for b in batches] == [1000, 1000, 500]
    assert [o["Key"] for b in batches for o in b] == keys
    assert all(
        call.kwargs["Bucket"] == "test-bucket"
        for call in s3_client.delete_objects.mock_calls
    )


def test_s3_project_delete_with_no_keys_makes_no_request(s3_client: MagicMock):
    delete_project_pdf_directory([])

    s3_client.delete_objects.assert_not_called()


# --- the boto3 client -------------------------------------------------------


def test_the_s3_client_is_created_once_from_the_settings(
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setattr(pdf_storage, "_s3_client", None)
    monkeypatch.setattr(settings, "S3_ENDPOINT_URL", "http://minio:9000")
    monkeypatch.setattr(settings, "S3_ACCESS_KEY_ID", "key-id")
    monkeypatch.setattr(settings, "S3_SECRET_ACCESS_KEY", "secret")
    monkeypatch.setattr(settings, "S3_REGION", "eu-north-1")

    with patch.object(pdf_storage.boto3, "client") as make_client:
        first = pdf_storage._client()
        second = pdf_storage._client()

    assert first is second
    make_client.assert_called_once()
    args, kwargs = make_client.call_args
    assert args == ("s3",)
    assert kwargs["endpoint_url"] == "http://minio:9000"
    assert kwargs["aws_access_key_id"] == "key-id"
    assert kwargs["aws_secret_access_key"] == "secret"
    assert kwargs["region_name"] == "eu-north-1"
    assert kwargs["config"].s3 == {"addressing_style": "path"}
