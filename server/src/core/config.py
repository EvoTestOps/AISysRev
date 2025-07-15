import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    def __init__(self):
        self.APP_ENV: str = os.getenv("APP_ENV", "dev")
        self.DB_URL: str = os.getenv("DB_URL")
        if not self.DB_URL:
            raise ValueError("Database URL not set in environment")
        print(f"Using APP_ENV: {self.APP_ENV}")
        print(f"Using DB_URL: {self.DB_URL}")

        self.SECRET_KEY: str = os.getenv("SECRET_KEY", "default-secret-key")
        self.ALGORITHM: str = "HS256"
        self.ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
        self.REDIS_URL: str = os.getenv("REDIS_URL")
        self.CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL")
        self.MINIO_ENDPOINT: str = os.getenv("MINIO_ENDPOINT", "localhost:9000")
        self.MINIO_ROOT_USER: str = os.getenv("MINIO_ROOT_USER", "minio-admin")
        self.MINIO_ROOT_PASSWORD: str = os.getenv("MINIO_ROOT_PASSWORD", "minio-secret-key")
        self.MINIO_BUCKET: str = os.getenv("MINIO_BUCKET", "default-bucket")

settings = Settings()
