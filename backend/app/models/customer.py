from __future__ import annotations

import hashlib
import hmac
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.reservation import Reservation

# Fallback pepper used only when PII_VAULT_KEY is absent (dev/test).
# TECH_DEBT: production MUST set PII_VAULT_KEY so hashes are peppered with
# the vault key; fallback value is public in-repo and not a secret.
_DEV_PHONE_PEPPER = b"dev-only-phone-pepper-do-not-use-in-prod"


class Customer(Base):
    """Phone-only marketplace buyer (guest browse + OTP at reserve).

    Plaintext phone never persists: callers store SHA-256 ``phone_hash``
    (unique lookup key) + PII-vault ``phone_token`` via
    ``app.core.pii_vault.protect``. Use ``reveal()`` only at
    display/notify boundaries; never log.
    """

    __tablename__ = "customers"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    phone_hash: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )
    phone_token: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    reservations: Mapped[list["Reservation"]] = relationship(
        "Reservation", back_populates="customer", cascade="all, delete-orphan"
    )

    @classmethod
    def hash_phone(cls, raw: str) -> str:
        """Normalize + HMAC-SHA256 hash a raw phone number.

        Strips non-digits, keeps last 10 (Indian MSISDN), HMACs with the
        PII-vault key when configured, else a documented dev fallback.
        Returns 64-char hex digest fitting ``phone_hash``.
        """
        digits = re.sub(r"\D", "", raw or "")
        msisdn = digits[-10:] if len(digits) >= 10 else digits
        try:
            from app.core.pii_vault import _load_key

            key = _load_key()
        except Exception:
            env = os.getenv("ENVIRONMENT", "development").lower()
            if env in ("production", "prod", "staging"):
                raise
            key = _DEV_PHONE_PEPPER
        return hmac.new(key, msisdn.encode("utf-8"), hashlib.sha256).hexdigest()
