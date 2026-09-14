"""Mock OTP service for phone-only marketplace reserve (SIH PS 26090).

Dev/test mock: generation returns fixed ``123456``; verification accepts
any 6-digit code (or the fixed dev code). Production wiring (SMS gateway)
is a later ticket — see TECH_DEBT.
"""

from __future__ import annotations

import os
import re

DEV_FIXED_CODE = "123456"

_OTP_RE = re.compile(r"^\d{6}$")
_store: dict[str, str] = {}

_MOCK_DISABLED_ENVS = {"production", "prod", "staging"}


def _mock_disabled() -> bool:
    return os.getenv("ENVIRONMENT", "").lower() in _MOCK_DISABLED_ENVS


def _normalize_phone(raw: str) -> str:
    digits = re.sub(r"\D", "", raw or "")
    return digits[-10:] if len(digits) >= 10 else digits


class OTPService:
    """In-memory mock OTP store."""

    def generate(self, phone: str) -> str:
        """Generate (mock) OTP for phone; dev returns fixed code."""
        if _mock_disabled():
            raise RuntimeError("Mock OTP disabled in production; wire SMS gateway.")
        code = DEV_FIXED_CODE
        _store[_normalize_phone(phone)] = code
        return code

    def verify(self, phone_or_code: str, code: str | None = None) -> bool:
        """Verify OTP (mock: any 6-digit code passes, incl. fixed dev code)."""
        if _mock_disabled():
            raise RuntimeError("Mock OTP disabled in production; wire SMS gateway.")
        otp = code if code is not None else phone_or_code
        if not isinstance(otp, str) or not _OTP_RE.match(otp):
            return False
        return True

    def clear(self) -> None:
        _store.clear()


otp_service = OTPService()
