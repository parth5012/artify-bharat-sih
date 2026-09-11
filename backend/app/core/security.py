"""
Security primitives: 4-digit PIN hashing, JWT bearer token issue/verify,
and a shared async Redis client (used for jury velocity counters etc).
"""
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from redis.asyncio import Redis, from_url

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)

_redis: Redis | None = None


def get_redis() -> Redis:
    """Lazily-created shared async Redis client (rate limiting, velocity counters)."""
    global _redis
    if _redis is None:
        _redis = from_url(settings.REDIS_URL, decode_responses=True)
    return _redis


# ---- PIN hashing -----------------------------------------------------------

def hash_pin(pin: str) -> str:
    if not (pin.isdigit() and len(pin) == 4):
        raise ValueError("PIN must be exactly 4 digits")
    return pwd_context.hash(pin)


def verify_pin(pin: str, pin_hash: str) -> bool:
    return pwd_context.verify(pin, pin_hash)


# ---- JWT --------------------------------------------------------------------

def create_access_token(subject: str, extra_claims: dict[str, Any] | None = None) -> str:
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": subject,
        "iat": now,
        "exp": now + timedelta(minutes=settings.JWT_EXPIRE_MINUTES),
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc


async def get_current_artisan_id(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str:
    """FastAPI dependency: extracts artisan_id from `Bearer <token>`."""
    if creds is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )
    payload = decode_access_token(creds.credentials)
    artisan_id = payload.get("sub")
    if not artisan_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject",
        )
    return artisan_id
