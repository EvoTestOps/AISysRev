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
        # print(f"Using APP_ENV: {self.APP_ENV}")
        # print(f"Using DB_URL: {self.DB_URL}")

        self.SECRET_KEY: str = get_env("SECRET_KEY", "yoursecretkey")
        self.ALGORITHM: str = "HS256"
        self.ACCESS_TOKEN_EXPIRE_SECONDS: int = 60 * 60 * 24 * 5
        self.CURRENT_TERMS_VERSION: str = "8.6.2026"
        self.CURRENT_PRIVACY_POLICY_VERSION: str = "8.6.2026"
        self.REDIS_URL: str = get_env("REDIS_URL")
        self.CELERY_BROKER_URL: str = get_env("CELERY_BROKER_URL")
        self.OIDC_CLIENT_ID: str = get_env("OIDC_CLIENT_ID", "")
        self.OIDC_CLIENT_SECRET: str = get_env("OIDC_CLIENT_SECRET", "")
        self.OIDC_ISSUER_URL: str = get_env("OIDC_ISSUER_URL", "https://login.helsinki.fi")
        self.OIDC_REDIRECT_URI: str = get_env("OIDC_REDIRECT_URI", "https://localhost:3001/api/v1/auth/callback")
        self.FRONTEND_URL: str = get_env("FRONTEND_URL", "https://localhost:3001")
        self.RUN_MIGRATIONS: bool = get_env("RUN_MIGRATIONS", "false").lower() in [
            "y",
            "1",
            "true",
            "yes",
        ]
        self.STAGING_ALLOWED_EMAILS: list[str] = [
            e.strip() for e in get_env("STAGING_ALLOWED_EMAILS", "").split(",") if e.strip()
        ]



settings = Settings()
