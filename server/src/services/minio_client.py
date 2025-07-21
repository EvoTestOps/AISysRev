from minio import Minio
from src.core.config import settings

minio_client = Minio(
    endpoint=settings.MINIO_ENDPOINT,
    access_key=settings.MINIO_ROOT_USER,
    secret_key=settings.MINIO_ROOT_PASSWORD,
    secure=False,
)

BUCKET_NAME = settings.MINIO_BUCKET


def check_and_create_s3_bucket():
    print("Checking that the defined S3 bucket exists..")
    try:
        if not minio_client.bucket_exists(settings.MINIO_BUCKET):
            minio_client.make_bucket(settings.MINIO_BUCKET)
    except Exception as e:
        print(f"Error during check_and_create_s3_bucket: {e}")
        raise
