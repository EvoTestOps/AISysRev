from minio import Minio
import os
from dotenv import load_dotenv

load_dotenv()

minio_client = Minio(
    endpoint=os.getenv("MINIO_ENDPOINT", "localhost:9000"),
    access_key=os.getenv("MINIO_ROOT_USER", "minio-admin"),
    secret_key=os.getenv("MINIO_ROOT_PASSWORD", "minio-secret-key"),
    secure=False
)

BUCKET_NAME = os.getenv("MINIO_BUCKET", "default-bucket")