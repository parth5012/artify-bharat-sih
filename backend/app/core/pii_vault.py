"""DPDP Act 2023 compliant AES-256-GCM PII tokenization vault.

Plaintext PII (Aadhaar, e-Shram UAN, bank accounts) must never persist in
the DB or logs — only opaque tokens produced here are stored. The 256-bit
data key is supplied exclusively via the ``PII_VAULT_KEY`` environment
variable (base64-encoded 32 bytes). Fail-closed: every operation raises
``RuntimeError`` when the key is absent or malformed. This module never
logs plaintext values.
"""

import base64
import os
import re

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

KEY_ENV_VAR = "PII_VAULT_KEY"
_NONCE_BYTES = 12
_KEY_BYTES = 32

_AADHAAR_RE = re.compile(r"^[2-9]\d{11}$")
_UAN_RE = re.compile(r"^\d{12}$")
_BANK_ACCOUNT_RE = re.compile(r"^\d{9,18}$")

_VALIDATORS = {
    "aadhaar": _AADHAAR_RE,
    "uan": _UAN_RE,
    "bank_account": _BANK_ACCOUNT_RE,
}


class PIIVaultError(RuntimeError):
    """Raised when tokenization/detokenization cannot proceed safely."""


class PIIDecryptionError(PIIVaultError):
    """Raised when a token cannot be authenticated/decrypted (wrong key, tampered)."""


def _load_key() -> bytes:
    raw = os.environ.get(KEY_ENV_VAR)
    if not raw:
        raise PIIVaultError(
            f"{KEY_ENV_VAR} is not set — refusing to handle PII without a vault key."
        )
    padded = raw + "=" * (-len(raw) % 4)
    try:
        key = base64.urlsafe_b64decode(padded)
    except Exception as exc:
        raise PIIVaultError(f"{KEY_ENV_VAR} is not valid base64.") from exc
    if len(key) != _KEY_BYTES:
        raise PIIVaultError(f"{KEY_ENV_VAR} must decode to 32 bytes (AES-256).")
    return key


def validate_pii_format(value: str, kind: str) -> bool:
    """Return True iff value matches the expected format for kind.

    kinds: ``aadhaar`` (12 digits, leading 2-9 per UIDAI numbering),
    ``uan`` (12-digit e-Shram UAN), ``bank_account`` (9-18 digits).
    Raises ValueError for unknown kinds.
    """
    try:
        pattern = _VALIDATORS[kind]
    except KeyError:
        raise ValueError(f"Unknown PII kind: {kind!r}.")
    return bool(pattern.match(value))


def tokenize(plaintext: str) -> str:
    """Encrypt plaintext with AES-256-GCM; return opaque base64url token."""
    if not isinstance(plaintext, str) or not plaintext:
        raise ValueError("plaintext must be a non-empty string.")
    aesgcm = AESGCM(_load_key())
    nonce = os.urandom(_NONCE_BYTES)
    blob = nonce + aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    return base64.urlsafe_b64encode(blob).decode("ascii")


def detokenize(token: str) -> str:
    """Decrypt a token produced by :func:`tokenize`."""
    if not isinstance(token, str) or not token:
        raise ValueError("token must be a non-empty string.")
    aesgcm = AESGCM(_load_key())
    try:
        blob = base64.urlsafe_b64decode(token + "=" * (-len(token) % 4))
        nonce, ciphertext = blob[:_NONCE_BYTES], blob[_NONCE_BYTES:]
        return aesgcm.decrypt(nonce, ciphertext, None).decode("utf-8")
    except InvalidTag as exc:
        raise PIIDecryptionError("Token authentication failed (wrong key or tampered).") from exc
    except PIIVaultError:
        raise
    except Exception as exc:
        raise PIIDecryptionError("Token could not be decrypted.") from exc


def tokenize_pii(value: str, kind: str) -> str:
    """Validate value format for kind, then tokenize. Raises ValueError on bad format."""
    if not validate_pii_format(value, kind):
        raise ValueError(f"Invalid {kind} format.")
    return tokenize(value)


# --- Integration helpers (Task 1.5b): vault wiring for Artisan/auth/payout ---
#
# Government IDs (TRIFED / Pehchan) have no fixed digit format, so call sites
# use protect()/reveal() (opportunistic, format-agnostic) rather than
# tokenize_pii() (strict, fail-closed). High-sensitivity kinds
# (aadhaar/uan/bank_account) must keep using tokenize_pii().

_MIN_TOKEN_BYTES = _NONCE_BYTES + 1 + 16  # nonce + >=1 plaintext byte + GCM tag


def is_vault_configured() -> bool:
    """Return True iff a well-formed vault key is available (never raises)."""
    try:
        _load_key()
        return True
    except PIIVaultError:
        return False


def is_vault_token(value: object) -> bool:
    """Best-effort check whether a value looks like a vault token.

    Used for backfill idempotency (skip already-tokenized rows) and to keep
    protect() idempotent. Short plaintext IDs (e.g. ``TRIFED-UP-VNS-1049``)
    can never collide: tokens always decode to >= 29 bytes.
    """
    if not isinstance(value, str) or not value:
        return False
    try:
        blob = base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))
    except Exception:
        return False
    return len(blob) >= _MIN_TOKEN_BYTES


def protect(value: object) -> object:
    """Tokenize a value for DB storage when the vault is configured.

    - ``None``/falsy values pass through unchanged (nullable columns).
    - Values that already look like tokens pass through (idempotent).
    - Without ``PII_VAULT_KEY`` in non-prod (dev/test) the plaintext passes
      through unchanged so local flows keep working; in
      production/staging (``ENVIRONMENT``) it raises ``PIIVaultError``
      (fail-closed). Production MUST set the key and
      run the backfill migration (see migrations/versions).
    """
    if not value:
        return value
    if not isinstance(value, str):
        return value
    if is_vault_token(value):
        return value
    if not is_vault_configured():
        env = os.environ.get("ENVIRONMENT", "development").lower()
        if env in ("production", "prod", "staging"):
            raise PIIVaultError(
                f"{KEY_ENV_VAR} is not set in {env} — refusing to persist plaintext PII."
            )
        return value
    return tokenize(value)


def reveal(value: object) -> object:
    """Detokenize a stored value for display strictly where needed.

    Falls back to the raw value when it is not a token (legacy plaintext
    rows, or environments without ``PII_VAULT_KEY``). Callers must only use
    this at display/settlement boundaries — never log or persist the result.
    """
    if not value:
        return value
    if not isinstance(value, str):
        return value
    try:
        return detokenize(value)
    except Exception:
        return value


def mask_pii(value: object, visible_last: int = 4) -> object:
    """Return a display-safe masked form of a PII value.

    - Digit/account IDs: ``XXXXXXXX9012`` (only last ``visible_last`` kept).
    - UPI VPAs (``name@bank``): local part masked, routing domain kept
      (``r********@sbi``) since it is needed for payout routing display.
    - Values shorter than ``visible_last`` are fully masked.
    """
    if value is None:
        return None
    if not isinstance(value, str) or not value:
        return value
    if "@" in value:
        local, _, domain = value.partition("@")
        if len(local) <= 1:
            masked_local = "***"
        else:
            masked_local = local[0] + "*" * (len(local) - 1)
        return f"{masked_local}@{domain}"
    if len(value) <= visible_last:
        return "X" * len(value)
    return "X" * (len(value) - visible_last) + value[-visible_last:]
