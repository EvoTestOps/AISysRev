import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    APP_ENV: str = os.getenv("APP_ENV", "dev")
    DB_URL: str = os.getenv("DB_URL")
    TEST_DB_URL: str = os.getenv("TEST_DB_URL")
    if APP_ENV == "test":
        DB_URL = TEST_DB_URL
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", "default-secret-key")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    MINIO_ENDPOINT: str = os.getenv("MINIO_ENDPOINT", "localhost:9000")
    MINIO_ROOT_USER: str = os.getenv("MINIO_ROOT_USER", "minio-admin")
    MINIO_ROOT_PASSWORD: str = os.getenv("MINIO_ROOT_PASSWORD", "minio-secret-key")
    MINIO_BUCKET: str = os.getenv("MINIO_BUCKET", "default-bucket")

settings = Settings()
