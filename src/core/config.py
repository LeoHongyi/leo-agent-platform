from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    APP_NAME: str = "MyApp"
    APP_ENV: str = "development"
    APP_DEBUG: bool = True

    DB_HOST: str = "127.0.0.1"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = ""
    DB_NAME: str = "myapp"

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = ""
    REDIS_DB: int = 0

    # Model provider
    PROVIDER_ENCRYPTION_KEY: str = ""
    PROVIDER_CONNECT_TIMEOUT_SECONDS: float = 10.0

    LOG_LEVEL: str = "DEBUG"
    LOG_DIR: str = "logs"

    # MinIO
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = ""
    MINIO_SECRET_KEY: str = ""
    MINIO_BUCKET: str = "knowledge-docs"
    MINIO_SECURE: bool = False
    KNOWLEDGE_MAX_FILE_SIZE_MB: int = Field(default=20, ge=1, le=500)
    KNOWLEDGE_MAX_SEGMENTS: int = Field(default=10_000, ge=1, le=100_000)

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"mysql+asyncmy://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
            f"?charset=utf8mb4"
        )

    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
    )


# 保存到内存缓存中。以后直接获取。这是一种单例的实现
@lru_cache
def get_settings() -> Settings:
    return Settings()
