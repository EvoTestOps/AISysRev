import asyncio

from botocore.exceptions import ClientError

from src.core.config import settings
from src.tools.pdf_storage import _client


def _check_and_create_bucket() -> None:
    client = _client()
    try:
        client.head_bucket(Bucket=settings.S3_BUCKET)
    except ClientError as e:
        if e.response["Error"]["Code"] != "404":
            raise
        client.create_bucket(Bucket=settings.S3_BUCKET)


async def check_storage_backend() -> None:
    if settings.STORAGE_BACKEND != "s3":
        print(f"Storage backend: local ({settings.PDF_STORAGE_PATH})")
        return

    try:
        await asyncio.to_thread(_check_and_create_bucket)
    except Exception as e:
        print(f"Storage backend check failed: {e}")
        raise
    print(
        f"Storage backend: s3 ({settings.S3_ENDPOINT_URL}, bucket={settings.S3_BUCKET})"
    )
