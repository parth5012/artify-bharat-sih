"""Phase 1 Task 1.5b: PII vault integration into Artisan/auth/payout/passport paths.

TDD integration tests (do not touch test_pii_vault.py):
- protect()/reveal()/mask_pii()/is_vault_token() helpers in app.core.pii_vault
- register_artisan stores vault tokens when PII_VAULT_KEY is set, plaintext
  passthrough otherwise (existing auth behavior stable)
- payout records never carry raw bank digits in display fields
- passport payload snapshots omit govt IDs (trifed/pehchan)
"""

import base64

import pytest
from sqlalchemy import select


def _test_key_b64() -> str:
    # Deterministic fixture key built from a low-entropy pattern (NOT a secret —
    # kept out of high-entropy-literal form so secret scanners stay quiet).
    return base64.urlsafe_b64encode((b"test-fixture-key-" * 2)[:32]).decode()


@pytest.fixture()
def vault_key(monkeypatch):
    monkeypatch.setenv("PII_VAULT_KEY", _test_key_b64())
    yield _test_key_b64()


@pytest.fixture()
def no_vault_key(monkeypatch):
    monkeypatch.delenv("PII_VAULT_KEY", raising=False)
    yield


# --- vault helper unit tests -------------------------------------------------


def test_protect_reveal_roundtrip_with_key(vault_key):
    from app.core.pii_vault import protect, reveal

    stored = protect("TRIFED-UP-VNS-1049")
    assert stored != "TRIFED-UP-VNS-1049"
    assert reveal(stored) == "TRIFED-UP-VNS-1049"


def test_protect_none_passthrough(vault_key):
    from app.core.pii_vault import protect, reveal

    assert protect(None) is None
    assert reveal(None) is None


def test_protect_passthrough_without_key(no_vault_key, monkeypatch):
    from app.core.pii_vault import protect

    monkeypatch.setenv("ENVIRONMENT", "development")
    assert protect("TRIFED-UP-VNS-1049") == "TRIFED-UP-VNS-1049"


def test_protect_fail_closed_in_production_without_key(no_vault_key, monkeypatch):
    from app.core.pii_vault import PIIVaultError, protect

    monkeypatch.setenv("ENVIRONMENT", "production")
    with pytest.raises(PIIVaultError):
        protect("TRIFED-UP-VNS-1049")


def test_reveal_legacy_plaintext_fallback_without_key(no_vault_key):
    from app.core.pii_vault import reveal

    assert reveal("TRIFED-UP-VNS-1049") == "TRIFED-UP-VNS-1049"


def test_protect_is_idempotent_with_key(vault_key):
    from app.core.pii_vault import is_vault_token, protect

    once = protect("TRIFED-UP-VNS-1049")
    assert is_vault_token(once) is True
    assert is_vault_token("TRIFED-UP-VNS-1049") is False
    assert protect(once) == once


def test_mask_pii_keeps_only_last_four(no_vault_key):
    from app.core.pii_vault import mask_pii

    masked = mask_pii("123456789012")
    assert "12345678" not in masked
    assert masked.endswith("9012")
    assert mask_pii("PEH-IND-88320").endswith("8320")
    assert "PEH-IND-8" not in mask_pii("PEH-IND-88320")


def test_mask_pii_upi_keeps_routing_domain_only(no_vault_key):
    from app.core.pii_vault import mask_pii

    masked = mask_pii("radhadevi@sbi")
    assert masked != "radhadevi@sbi"
    assert masked.endswith("@sbi")
    assert "radhadevi" not in masked


def test_mask_pii_short_values_fully_masked(no_vault_key):
    from app.core.pii_vault import mask_pii

    assert mask_pii("123") == "XXX"
    assert mask_pii(None) is None


# --- payout path -------------------------------------------------------------


def test_payout_bank_destination_never_stored_raw(vault_key):
    from app.core.pii_vault import reveal
    from app.services.payout_service import PayoutService

    svc = PayoutService()
    raw_account = "50100234567890"
    record = svc.execute_direct_payout(
        order_id="ord_test_1",
        artisan_id="art_test_1",
        amount_inr=9800.0,
        payout_channel="JAN_DHAN_DIRECT",
        upi_id_or_account=raw_account,
    )
    assert record["destination_account"] != raw_account
    assert record["destination_account"].endswith("7890")
    assert raw_account not in str(record)
    assert reveal(record["destination_account_token"]) == raw_account
    assert svc.reveal_destination(record) == raw_account


def test_payout_upi_destination_masked_display_revealable(vault_key):
    from app.services.payout_service import PayoutService

    svc = PayoutService()
    record = svc.execute_direct_payout(
        order_id="ord_test_2",
        artisan_id="art_test_1",
        amount_inr=1500.0,
        payout_channel="UPI_DIRECT",
        upi_id_or_account="radhadevi@sbi",
    )
    assert record["destination_account"] != "radhadevi@sbi"
    assert record["destination_account"].endswith("@sbi")
    assert svc.reveal_destination(record) == "radhadevi@sbi"


# --- auth/register path (direct handler call, no app lifespan) ---------------


@pytest.mark.asyncio
async def test_register_stores_vault_token_when_key_set(db_session, vault_key):
    from app.api.v1.auth import register_artisan
    from app.models.artisan import Artisan
    from app.schemas.auth import VoiceRegisterRequest

    payload = VoiceRegisterRequest(
        name="Vault Arti",
        phone="9000000001",
        pin="1234",
        trifed_id="TRIFED-UP-VNS-1049",
        pehchan_id="PEH-IND-88320",
    )
    await register_artisan(payload, db_session)

    res = await db_session.execute(select(Artisan).where(Artisan.phone == "9000000001"))
    artisan = res.scalar_one()
    assert artisan.trifed_id != "TRIFED-UP-VNS-1049"
    assert artisan.pehchan_id != "PEH-IND-88320"

    from app.core.pii_vault import reveal

    assert reveal(artisan.trifed_id) == "TRIFED-UP-VNS-1049"
    assert reveal(artisan.pehchan_id) == "PEH-IND-88320"


@pytest.mark.asyncio
async def test_register_plaintext_passthrough_without_key(db_session, no_vault_key):
    from app.api.v1.auth import register_artisan
    from app.models.artisan import Artisan
    from app.schemas.auth import VoiceRegisterRequest

    payload = VoiceRegisterRequest(
        name="Legacy Arti",
        phone="9000000002",
        pin="1234",
        trifed_id="TRIFED-UP-VNS-1049",
        pehchan_id="PEH-IND-88320",
    )
    resp = await register_artisan(payload, db_session)
    assert resp.phone == "9000000002"

    res = await db_session.execute(select(Artisan).where(Artisan.phone == "9000000002"))
    artisan = res.scalar_one()
    assert artisan.trifed_id == "TRIFED-UP-VNS-1049"


# --- passport snapshot path --------------------------------------------------


@pytest.mark.asyncio
async def test_passport_snapshot_omits_govt_ids(db_session, vault_key):
    from app.core.security import get_pin_hash
    from app.models.artisan import Artisan
    from app.models.product import Product
    from app.services.passport_service import passport_service

    artisan = Artisan(
        name="Passport Arti",
        phone="9000000003",
        pin_hash=get_pin_hash("1234"),
        trifed_id="TRIFED-UP-VNS-1049",
        pehchan_id="PEH-IND-88320",
    )
    # Simulate a vault-backed row: store tokens as register_artisan would.
    from app.core.pii_vault import protect

    artisan.trifed_id = protect("TRIFED-UP-VNS-1049")
    artisan.pehchan_id = protect("PEH-IND-88320")
    db_session.add(artisan)
    await db_session.flush()

    product = Product(artisan_id=artisan.id, title="GI Banarasi Brocade")
    db_session.add(product)
    await db_session.flush()

    passport = await passport_service.issue_passport(db_session, product.id)
    snapshot = passport.payload_snapshot
    assert "trifed_id" not in snapshot["artisan"]
    assert "pehchan_id" not in snapshot["artisan"]
    assert "TRIFED-UP-VNS-1049" not in str(snapshot)
    assert "PEH-IND-88320" not in str(snapshot)

    # Deterministic hash preserved across re-issue (detokenized in-memory only).
    again = await passport_service.issue_passport(db_session, product.id)
    assert again.passport_hash == passport.passport_hash
