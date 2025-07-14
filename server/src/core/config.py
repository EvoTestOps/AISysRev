import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    APP_ENV: str = os.getenv("APP_ENV", "dev")
    if APP_ENV == "test":
        DB_URL: str = os.getenv("TEST_DB_URL")
    else:
        DB_URL: str = os.getenv("DB_URL")
    if not DB_URL:
        raise ValueError("Database URL not set in environment")
    print(f"Using APP_ENV: {APP_ENV}")
    print(f"Using DB_URL: {DB_URL}")
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", "default-secret-key")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REDIS_URL: str = os.getenv("REDIS_URL")
    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL")
    MINIO_ENDPOINT: str = os.getenv("MINIO_ENDPOINT", "localhost:9000")
    MINIO_ROOT_USER: str = os.getenv("MINIO_ROOT_USER", "minio-admin")
    MINIO_ROOT_PASSWORD: str = os.getenv("MINIO_ROOT_PASSWORD", "minio-secret-key")
    MINIO_BUCKET: str = os.getenv("MINIO_BUCKET", "default-bucket")

settings = Settings()
