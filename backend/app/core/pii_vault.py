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
