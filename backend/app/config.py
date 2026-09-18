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

    # CV / AI Studio image-size limits
    # MAX_UPLOAD_BYTES  — reject raw upload bytes before any decode attempt
    # MAX_IMAGE_SIDE_PX — reject decoded images whose longest side exceeds this
    # MAX_OUTPUT_SIDE_PX — reject crop_to_square calls that would produce a canvas
    #                      larger than this side length (= max(h, w) of decoded img)
    CV_MAX_UPLOAD_BYTES: int = 20 * 1024 * 1024   # 20 MB
    CV_MAX_IMAGE_SIDE_PX: int = 8_000             # 8 000 px
    CV_MAX_OUTPUT_SIDE_PX: int = 4_096            # 4 096 px square canvas cap

    # WhatsApp Business Cloud API (Meta Graph API v20.0)
    WHATSAPP_ACCESS_TOKEN: str = "mock_whatsapp_access_token_sih26090"
    WHATSAPP_PHONE_NUMBER_ID: str = "109876543210987"
    WHATSAPP_API_VERSION: str = "v20.0"
    WHATSAPP_API_URL: str = "https://graph.facebook.com/v20.0"

    # Verification & Heritage Passport
    PASSPORT_VERIFICATION_BASE_URL: str = "https://verify.artifybharat.in/passport"
    ENABLE_DEMO_INVENTORY: bool = False  # Development-only flag to inject sample items if inventory is empty

    # LangSmith Observability (LLM tracing for the Ask Dadi agent)
    # Set LANGSMITH_TRACING=true + LANGSMITH_API_KEY to stream traces to smith.langchain.com
    LANGSMITH_TRACING: bool = False
    LANGSMITH_API_KEY: str = ""
    LANGSMITH_PROJECT: str = "artify-bharat-ask-dadi"
    LANGSMITH_ENDPOINT: str = "https://api.smith.langchain.com"

    # Ask Dadi online agent (Groq).backend/.env is the single source of truth:
    # GROQ_API_KEY=gsk_...   -> agent boots in ONLINE (LLM tool-calling) mode
    # empty / missing        -> agent stays in OFFLINE knowledge-base mode
    # NOTE: the model MUST support custom (local) tool calling. groq/compound
    # and groq/compound-mini are built-in-tool systems and REJECT custom tools.
    # Supported (per console.groq.com/docs/tool-use/overview):
    #   openai/gpt-oss-120b (recommended), openai/gpt-oss-20b,
    #   qwen/qwen3.6-27b, qwen/qwen3.8-27b
    #   (llama-3.3-70b-versatile works but is Enterprise-only on Groq now)
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "openai/gpt-oss-120b"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
