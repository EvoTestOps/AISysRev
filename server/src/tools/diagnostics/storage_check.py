import asyncio
import logging

from botocore.exceptions import ClientError

from src.core.config import settings
from src.tools.pdf_storage import _client

logger = logging.getLogger(__name__)


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
        logger.info("Storage backend: local (%s)", settings.PDF_STORAGE_PATH)
        return

    try:
        await asyncio.to_thread(_check_and_create_bucket)
    except Exception as e:
        logger.error("Storage backend check failed: %s", e)
        raise
    logger.info(
        "Storage backend: s3 (%s, bucket=%s)",
        settings.S3_ENDPOINT_URL,
        settings.S3_BUCKET,
    )
