import json
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode
from pydantic_settings import BaseSettings
from typing import List


def _strip_sslmode(url: str) -> str:
    """Remove sslmode query param — asyncpg handles SSL via connect_args, not URL."""
    parsed = urlparse(url)
    params = parse_qs(parsed.query, keep_blank_values=True)
    params.pop("sslmode", None)
    new_query = urlencode({k: v[0] for k, v in params.items()})
    return urlunparse(parsed._replace(query=new_query))


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/restaurant_db"
    DATABASE_URL_SYNC: str = "postgresql://postgres:postgres@localhost:5432/restaurant_db"
    SECRET_KEY: str = "your-super-secret-key-change-in-production-please"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    CORS_ORIGINS: str = '["http://localhost:3000"]'

    class Config:
        env_file = ".env"
        extra = "allow"

    @property
    def async_db_url(self) -> str:
        url = _strip_sslmode(self.DATABASE_URL)
        # Ensure async driver prefix
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    @property
    def sync_db_url(self) -> str:
        url = _strip_sslmode(self.DATABASE_URL_SYNC)
        # Ensure sync driver prefix (no +asyncpg)
        if url.startswith("postgresql+asyncpg://"):
            url = url.replace("postgresql+asyncpg://", "postgresql://", 1)
        return url

    @property
    def cors_origins_list(self) -> List[str]:
        try:
            parsed = json.loads(self.CORS_ORIGINS)
            if isinstance(parsed, list):
                return parsed
        except (json.JSONDecodeError, TypeError):
            pass
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
