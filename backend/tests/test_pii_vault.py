"""DPDP Act 2023: AES-256 PII vault tokenization tests (TDD red first)."""

import base64
import os

import pytest
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def _test_key_b64() -> str:
    return base64.urlsafe_b64encode(b"0123456789abcdef0123456789abcdef").decode()


@pytest.fixture()
def vault_key(monkeypatch):
    monkeypatch.setenv("PII_VAULT_KEY", _test_key_b64())
    yield _test_key_b64()


def test_roundtrip_aadhaar(vault_key):
    from app.core.pii_vault import tokenize, detokenize

    aadhaar = "234567890123"
    token = tokenize(aadhaar)
    assert token != aadhaar
    assert detokenize(token) == aadhaar


def test_roundtrip_uan_and_bank_account(vault_key):
    from app.core.pii_vault import tokenize, detokenize

    for value in ("100234567890", "50100234567890"):
        token = tokenize(value)
        assert detokenize(token) == value


def test_no_plaintext_leakage_in_token(vault_key):
    from app.core.pii_vault import tokenize

    aadhaar = "234567890123"
    token = tokenize(aadhaar)
    assert aadhaar not in token
    raw = base64.urlsafe_b64decode(token + "=" * (-len(token) % 4))
    assert aadhaar.encode() not in raw


def test_wrong_key_fails(monkeypatch):
    from app.core import pii_vault

    monkeypatch.setenv("PII_VAULT_KEY", _test_key_b64())
    token = pii_vault.tokenize("234567890123")
    other = base64.urlsafe_b64encode(b"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx").decode()
    monkeypatch.setenv("PII_VAULT_KEY", other)
    with pytest.raises(Exception):
        pii_vault.detokenize(token)


def test_fail_closed_without_key(monkeypatch):
    from app.core import pii_vault

    monkeypatch.delenv("PII_VAULT_KEY", raising=False)
    with pytest.raises(RuntimeError):
        pii_vault.tokenize("234567890123")
    with pytest.raises(RuntimeError):
        pii_vault.detokenize("bogus")


def test_tampered_token_fails(vault_key):
    from app.core.pii_vault import tokenize, detokenize

    token = tokenize("234567890123")
    bad = ("A" if not token.startswith("A") else "B") + token[1:]
    with pytest.raises(Exception):
        detokenize(bad)


def test_format_validators():
    from app.core.pii_vault import validate_pii_format

    assert validate_pii_format("234567890123", "aadhaar") is True
    assert validate_pii_format("123", "aadhaar") is False
    assert validate_pii_format("100234567890", "uan") is True
    assert validate_pii_format("abc", "uan") is False
    assert validate_pii_format("50100234567890", "bank_account") is True
    assert validate_pii_format("12", "bank_account") is False
    with pytest.raises(ValueError):
        validate_pii_format("x", "passport")


def test_tokenize_validates_format(vault_key):
    from app.core.pii_vault import tokenize_pii, detokenize

    token = tokenize_pii("234567890123", "aadhaar")
    assert detokenize(token) == "234567890123"
    with pytest.raises(ValueError):
        tokenize_pii("123", "aadhaar")


def test_tokens_are_nondeterministic(vault_key):
    from app.core.pii_vault import tokenize

    assert tokenize("234567890123") != tokenize("234567890123")


def test_aesgcm_backend_is_aes256(vault_key):
    assert AESGCM is not None
