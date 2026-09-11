"""
Central configuration for the Artify Bharat backend (Mayank's modules).
Loaded from environment variables / .env at process start.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Core
    SECRET_KEY: str = "artify_bharat_super_secret_jwt_key_2026_sih"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days, voice-first users stay logged in

    DATABASE_URL: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/artify_bharat"
    )
    REDIS_URL: str = "redis://localhost:6379/0"

    # Government e-KYC integration endpoints
    MOSJE_PMDAKSH_API_URL: str = "https://pmdaksh.dosje.gov.in/api/v1/verify"
    ESHRAM_LOOKUP_API_URL: str = "https://eshram.gov.in/api/v1/lookup"
    TRIFED_VERIFY_API_URL: str = "https://trifed.tribal.gov.in/api/verify"
    PMSURAJ_LOOKUP_API_URL: str = "https://pmsuraj.gov.in/api/v1/lookup"

    # Logistics & DBT
    INDIA_POST_API_KEY: str = "your_india_post_sandbox_key"
    INDIA_POST_API_URL: str = "https://speedpost.indiapost.gov.in/api/v1"
    PFMS_DBT_MERCHANT_KEY: str = "your_pfms_dbt_escrow_key"
    PFMS_DBT_API_URL: str = "https://pfms.nic.in/api/v1/dbt"

    # IVR (Bhashini)
    BHASHINI_API_KEY: str = "your_bhashini_api_key_here"
    BHASHINI_USER_ID: str = "your_bhashini_user_id"
    BHASHINI_PIPELINE_ID: str = "64392f96daac500b55c543d6"

    # Anti-corruption tuning
    JURY_QUORUM_SIZE: int = 3
    JURY_QUORUM_THRESHOLD: int = 2  # 2 of 3
    JURY_VELOCITY_LIMIT_PER_HOUR: int = 20
    JURY_STALE_HOURS: int = 24

    # Payouts
    PAYOUT_PLATFORM_FEE_PCT: float = 0.0  # 0% middleman commission, by design


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
