from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "ArtifyBharat Backend"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Security
    SECRET_KEY: str = "artify-bharat-sih-super-secure-jwt-secret-key-change-in-prod-26090"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
        "http://localhost:8080",
        "*",
    ]

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./artify_bharat.db"
    POSTGRES_DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/artify_bharat"

    # Redis & Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # Object Storage (AWS S3 / Cloudflare R2 / MinIO)
    STORAGE_TYPE: str = "local"  # "local", "s3", "minio"
    STORAGE_LOCAL_DIR: str = "./media_storage"
    S3_ENDPOINT_URL: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_BUCKET_NAME: str = "artify-bharat-assets"
    S3_REGION: str = "ap-south-1"

    # AI & ML Pipelines
    USE_MOCK_AI: bool = True  # Allows running tests & local dev without heavy GPU models
    WHISPER_MODEL_SIZE: str = "base"
    INDICTRANS2_ENDPOINT: str = "http://localhost:8001/translate"
    MISTRAL_LLM_ENDPOINT: str = "http://localhost:11434/api/generate"  # Ollama / vLLM endpoint
    MISTRAL_MODEL_NAME: str = "mistral:7b-instruct"
    U2NET_WEIGHTS_PATH: str = "./models/u2net.pth"
    XGBOOST_PRICING_MODEL_PATH: str = "./models/pricing_xgboost.json"

    # Verification & Heritage Passport
    PASSPORT_VERIFICATION_BASE_URL: str = "https://verify.artifybharat.in/passport"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
