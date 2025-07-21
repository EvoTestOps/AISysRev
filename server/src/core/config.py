from typing import Optional
from dotenv import load_dotenv

load_dotenv()


def get_env(name: str, default: Optional[str] = None) -> str:
    import os

    result = os.getenv(name, default)
    if result is None:
        raise Exception(f"FATAL: Environment variable {name} is not set")
    return result


class Settings:
    def __init__(self):
        self.APP_ENV: str = get_env("APP_ENV", "dev")
        self.DB_URL: str = get_env("DB_URL")
        if not self.DB_URL:
            raise ValueError("Database URL not set in environment")
        print(f"Using APP_ENV: {self.APP_ENV}")
        print(f"Using DB_URL: {self.DB_URL}")

        self.SECRET_KEY: str = get_env("SECRET_KEY", "yoursecretkey")
        self.ALGORITHM: str = "HS256"
        self.ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
        self.REDIS_URL: str = get_env("REDIS_URL")
        self.CELERY_BROKER_URL: str = get_env("CELERY_BROKER_URL")
        self.MINIO_ENDPOINT: str = get_env("MINIO_ENDPOINT")
        self.MINIO_ROOT_USER: str = get_env("MINIO_ROOT_USER")
        self.MINIO_ROOT_PASSWORD: str = get_env("MINIO_ROOT_PASSWORD")
        self.MINIO_BUCKET: str = get_env("MINIO_BUCKET", "default-bucket")


settings = Settings()
