import hashlib
from pathlib import Path
from uuid import UUID

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from src.core.config import settings

_s3_client = None


def _client():
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT_URL,
            aws_access_key_id=settings.S3_ACCESS_KEY_ID,
            aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
            region_name=settings.S3_REGION,
            config=Config(
                s3={"addressing_style": "path"},
                retries={"mode": "standard"},
                request_checksum_calculation="when_required",
                response_checksum_validation="when_required",
            ),
        )
    return _s3_client


def build_storage_path(owner_uuid: UUID, content: bytes) -> str:
    content_hash = hashlib.sha256(content).hexdigest()
    if settings.STORAGE_BACKEND == "s3":
        return f"{owner_uuid}/{content_hash}.pdf"
    return f"{settings.PDF_STORAGE_PATH}/{owner_uuid}/{content_hash}.pdf"


def write_pdf_bytes(storage_path: str, content: bytes) -> None:
    if settings.STORAGE_BACKEND == "s3":
        try:
            _client().head_object(Bucket=settings.S3_BUCKET, Key=storage_path)
            return
        except ClientError as e:
            if e.response["Error"]["Code"] != "404":
                raise
        _client().put_object(
            Bucket=settings.S3_BUCKET,
            Key=storage_path,
            Body=content,
            ContentType="application/pdf",
        )
        return

    path = Path(storage_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)


def read_pdf_bytes(storage_path: str) -> bytes:
    if settings.STORAGE_BACKEND == "s3":
        try:
            response = _client().get_object(Bucket=settings.S3_BUCKET, Key=storage_path)
        except ClientError as e:
            if e.response["Error"]["Code"] in ("NoSuchKey", "404"):
                raise FileNotFoundError(storage_path) from e
            raise
        return response["Body"].read()

    return Path(storage_path).read_bytes()


def delete_pdf_bytes(storage_path: str) -> None:
    if settings.STORAGE_BACKEND == "s3":
        _client().delete_object(Bucket=settings.S3_BUCKET, Key=storage_path)
        return

    Path(storage_path).unlink(missing_ok=True)


def delete_project_pdf_directory(storage_paths: list[str]) -> None:
    if not storage_paths:
        return

    if settings.STORAGE_BACKEND == "s3":
        client = _client()
        for i in range(0, len(storage_paths), 1000):
            chunk = storage_paths[i : i + 1000]
            client.delete_objects(
                Bucket=settings.S3_BUCKET,
                Delete={"Objects": [{"Key": p} for p in chunk]},
            )
        return

    for p in storage_paths:
        Path(p).unlink(missing_ok=True)
