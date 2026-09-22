import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Any
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import get_settings

settings = get_settings()
security_scheme = HTTPBearer(auto_error=False)


class AuthenticatedPrincipal:
    def __init__(self, id: str, role: str = "artisan"):
        self.id = str(id)
        self.role = role


def get_pin_hash(pin: str) -> str:
    """Hashes an artisan security PIN using standard PBKDF2-HMAC-SHA256."""
    salt = os.urandom(16).hex()
    key = hashlib.pbkdf2_hmac(
        'sha256',
        pin.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    ).hex()
    return f"{salt}${key}"


hash_pin = get_pin_hash


def verify_pin(plain_pin: str, hashed_pin: str) -> bool:
    """Verifies a plain PIN against its stored salt$hash representation."""
    try:
        salt, stored_key = hashed_pin.split('$')
        new_key = hashlib.pbkdf2_hmac(
            'sha256',
            plain_pin.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        ).hex()
        return hmac.compare_digest(stored_key, new_key)
    except Exception:
        return False


def create_access_token(subject: str | Any, role: str = "artisan", expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {"exp": expire, "sub": str(subject), "role": role}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


async def get_current_artisan(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)
) -> AuthenticatedPrincipal:
    """
    Validates JWT bearer token and extracts the authenticated principal.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return AuthenticatedPrincipal(
        id=payload["sub"],
        role=payload.get("role", "artisan"),
    )


_redis: Any = None


async def get_redis():
    """FastAPI dependency: yields shared async Redis client (rate limiting, jury velocity counters) and closes cleanly per-request."""
    global _redis
    if _redis is None:
        from redis.asyncio import from_url
        _redis = from_url(settings.REDIS_URL, decode_responses=True)
    try:
        yield _redis
    finally:
        pass  # connection is pooled/shared across requests; closed on app shutdown

