"""
End-to-End (E2E) Integration Test Suite for US-ONB-01:
3-Step Progressive Onboarding Flow with 'Ask Dadi' Voice Assistance & 1-Tap MoSJE/e-Shram Verification.

Test Coverage:
- Flow 1 (Artisan Direct): Step 1 (Phone + PIN + Bhojpuri) -> Step 2 (Pehchan verify + auto-cluster) -> Step 3 (Profile + Welcome) -> Token generation + PIN login verification.
- Flow 2 (SHG Leader): Step 1 (Phone + PIN + Hindi + SHG role) -> Step 2 (Manual Fallback / ID) -> Step 3 (SHG Group name + member count) -> Completion.
- Flow 3 (Offline Sync): Composite payload sync to /onboarding/sync directly creating onboarded artisan when network returns.
- Flow 4 (Security & Edge Cases): Duplicate phone rejection, invalid PIN rejection, invalid phone rejection, unverified fallback, wrong PIN login rejection, non-existent artisan 404s.
"""

import base64
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pii_vault import is_vault_token, reveal
from app.models.artisan import Artisan


def _test_key_b64() -> str:
    return base64.urlsafe_b64encode((b"test-fixture-key-" * 2)[:32]).decode()


@pytest.fixture
def vault_key(monkeypatch):
    key = _test_key_b64()
    monkeypatch.setenv("PII_VAULT_KEY", key)
    yield key


# ============================================================================
# FLOW 1: Artisan Direct User Journey (Bhojpuri Dialect + Pehchan + Auto-Cluster)
# ============================================================================


@pytest.mark.asyncio
async def test_flow_1_artisan_direct_e2e(
    client: AsyncClient, db_session: AsyncSession, vault_key: str
):
    """
    Flow 1 (Artisan Direct):
    Step 1: Phone + PIN + Bhojpuri dialect + artisan role.
    Step 2: Pehchan ID auto-lookup in MoSJE/National Handicrafts master registry.
    Step 3: Artisan profile completion with craft category -> token issuance.
    Login Verification: Log in using phone and PIN, verify issued JWT token.
    DB State: Verify persistence, onboarded flag, and PII vault encryption.
    """
    phone = "9876540001"
    pin = "1234"
    dialect = "bhojpuri"
    role = "artisan"
    pehchan_id = "PEH-IND-88320"

    # --- Step 1: Voice/Direct Initiation ---
    step1_payload = {
        "phone": phone,
        "pin": pin,
        "dialect": dialect,
        "role": role,
    }
    res_s1 = await client.post("/api/v1/auth/onboarding/step1", json=step1_payload)
    assert res_s1.status_code in (200, 201), f"Step 1 failed: {res_s1.text}"
    s1_data = res_s1.json()
    assert s1_data["phone"] == phone
    assert s1_data["role"] == "artisan"
    assert s1_data["dialect"] == "bhojpuri"
    assert s1_data["next_step"] == 2
    assert "session_token" in s1_data
    assert "artisan_id" in s1_data
    artisan_id = s1_data["artisan_id"]

    # --- Step 2: 1-Tap Government Pehchan Verification ---
    step2_payload = {
        "artisan_id": artisan_id,
        "id_type": "pehchan",
        "id_number": pehchan_id,
    }
    res_s2 = await client.post("/api/v1/auth/onboarding/step2", json=step2_payload)
    assert res_s2.status_code == 200, f"Step 2 failed: {res_s2.text}"
    s2_data = res_s2.json()
    assert s2_data["artisan_id"] == artisan_id
    assert s2_data["verified"] is True
    assert s2_data["cluster_name"] == "Varanasi Handloom Cluster"
    assert s2_data["state"] == "Uttar Pradesh"
    assert s2_data["district"] == "Varanasi"
    assert s2_data["next_step"] == 3

    # --- Step 3: Profile Setup & Welcome Completion ---
    step3_payload = {
        "artisan_id": artisan_id,
        "name": "Gauri Devi",
        "craft_category": "हथकरघा वस्त्र (Handloom Textile)",
    }
    res_s3 = await client.post("/api/v1/auth/onboarding/step3", json=step3_payload)
    assert res_s3.status_code == 200, f"Step 3 failed: {res_s3.text}"
    s3_data = res_s3.json()
    assert s3_data["is_onboarded"] is True
    assert s3_data["name"] == "Gauri Devi"
    assert s3_data["role"] == "artisan"
    assert s3_data["cluster_name"] == "Varanasi Handloom Cluster"
    assert "access_token" in s3_data
    assert s3_data["token_type"].lower() == "bearer"

    # --- Verification 1: Subsequent PIN Login ---
    login_payload = {"phone": phone, "pin": pin}
    res_login = await client.post("/api/v1/auth/login", json=login_payload)
    assert res_login.status_code == 200, f"Login failed: {res_login.text}"
    login_data = res_login.json()
    assert "access_token" in login_data
    assert login_data["phone"] == phone
    assert login_data["name"] == "Gauri Devi"
    assert login_data["artisan_id"] == artisan_id

    # --- Verification 2: Database Persistence & PII Protection ---
    stmt = select(Artisan).where(Artisan.id == artisan_id)
    db_res = await db_session.execute(stmt)
    persisted_artisan = db_res.scalar_one_or_none()
    assert persisted_artisan is not None
    assert persisted_artisan.is_onboarded is True
    assert persisted_artisan.primary_dialect == "bhojpuri"
    assert persisted_artisan.cluster_name == "Varanasi Handloom Cluster"
    assert is_vault_token(persisted_artisan.pehchan_id)
    assert reveal(persisted_artisan.pehchan_id) == pehchan_id


# ============================================================================
# FLOW 2: SHG Leader Journey (Hindi + Manual Fallback + SHG Group Registration)
# ============================================================================


@pytest.mark.asyncio
async def test_flow_2_shg_leader_e2e(client: AsyncClient, db_session: AsyncSession):
    """
    Flow 2 (SHG Leader):
    Step 1: Phone + PIN + Hindi dialect + shg_leader role.
    Step 2: Manual fallback (id_type='none') with regional cluster definition.
    Step 3: SHG group name and member count registration -> leader token issuance.
    Login Verification: Log in using leader credentials.
    DB State: Verify SHG group name, member count, and shg_leader role.
    """
    phone = "9876540002"
    pin = "5678"
    dialect = "hindi"
    role = "shg_leader"

    # --- Step 1: SHG Leader Initiation ---
    step1_payload = {
        "phone": phone,
        "pin": pin,
        "dialect": dialect,
        "role": role,
    }
    res_s1 = await client.post("/api/v1/auth/onboarding/step1", json=step1_payload)
    assert res_s1.status_code in (200, 201), f"Step 1 failed: {res_s1.text}"
    s1_data = res_s1.json()
    assert s1_data["role"] == "shg_leader"
    assert s1_data["dialect"] == "hindi"
    assert s1_data["next_step"] == 2
    artisan_id = s1_data["artisan_id"]

    # --- Step 2: Manual Fallback ID & Location Entry ---
    step2_payload = {
        "artisan_id": artisan_id,
        "id_type": "none",
        "manual_state": "Madhya Pradesh",
        "manual_district": "Chanderi",
        "manual_cluster": "Chanderi Handloom Weavers Cluster",
    }
    res_s2 = await client.post("/api/v1/auth/onboarding/step2", json=step2_payload)
    assert res_s2.status_code == 200, f"Step 2 failed: {res_s2.text}"
    s2_data = res_s2.json()
    assert s2_data["verified"] is False
    assert s2_data["cluster_name"] == "Chanderi Handloom Weavers Cluster"
    assert s2_data["state"] == "Madhya Pradesh"
    assert s2_data["district"] == "Chanderi"
    assert s2_data["next_step"] == 3

    # --- Step 3: SHG Group Profile & Member Capacity Setup ---
    step3_payload = {
        "artisan_id": artisan_id,
        "name": "Kamla Bai",
        "craft_category": "चंदेरी साड़ी बुनाई (Chanderi Saree Weaving)",
        "shg_group_name": "माँ शारदा महिला बुनकर समूह (Maa Sharda Mahila Bunker Samiti)",
        "shg_member_count": 25,
    }
    res_s3 = await client.post("/api/v1/auth/onboarding/step3", json=step3_payload)
    assert res_s3.status_code == 200, f"Step 3 failed: {res_s3.text}"
    s3_data = res_s3.json()
    assert s3_data["is_onboarded"] is True
    assert s3_data["role"] == "shg_leader"
    assert s3_data["name"] == "Kamla Bai"
    assert "access_token" in s3_data

    # --- Verification 1: Login Verification ---
    res_login = await client.post(
        "/api/v1/auth/login", json={"phone": phone, "pin": pin}
    )
    assert res_login.status_code == 200
    assert res_login.json()["name"] == "Kamla Bai"

    # --- Verification 2: Database Persistence ---
    stmt = select(Artisan).where(Artisan.id == artisan_id)
    db_res = await db_session.execute(stmt)
    leader = db_res.scalar_one_or_none()
    assert leader is not None
    assert leader.role == "shg_leader"
    assert (
        leader.shg_group_name
        == "माँ शारदा महिला बुनकर समूह (Maa Sharda Mahila Bunker Samiti)"
    )
    assert leader.shg_member_count == 25
    assert leader.cluster_name == "Chanderi Handloom Weavers Cluster"


# ============================================================================
# FLOW 3: Offline Sync (1-Shot Resilient Synchronization)
# ============================================================================


@pytest.mark.asyncio
async def test_flow_3_offline_sync_e2e(client: AsyncClient, db_session: AsyncSession):
    """
    Flow 3 (Offline Sync):
    Simulates rural connectivity recovery where complete onboarding draft
    created in browser IndexedDB/localStorage is synced in one shot.
    - Sync Artisan Direct with Pehchan credentials.
    - Sync SHG Leader with manual cluster details and member count.
    - Verify immediate token issuance and subsequent PIN login.
    """
    # 1. Artisan Direct Offline Sync
    artisan_payload = {
        "phone": "9876540003",
        "pin": "4321",
        "name": "Sita Devi",
        "dialect": "maithili",
        "role": "artisan",
        "id_type": "pehchan",
        "id_number": "PEH-IND-88320",
        "craft_category": "मधुबनी चित्रकला (Madhubani Art)",
    }
    res_artisan_sync = await client.post(
        "/api/v1/auth/onboarding/sync", json=artisan_payload
    )
    assert res_artisan_sync.status_code in (
        200,
        201,
    ), f"Sync failed: {res_artisan_sync.text}"
    art_data = res_artisan_sync.json()
    assert art_data["is_onboarded"] is True
    assert art_data["name"] == "Sita Devi"
    assert art_data["role"] == "artisan"
    assert (
        art_data["cluster_name"] == "Varanasi Handloom Cluster"
    )  # auto-filled from Pehchan
    assert "access_token" in art_data

    # Verify PIN login immediately after sync
    login_art = await client.post(
        "/api/v1/auth/login", json={"phone": "9876540003", "pin": "4321"}
    )
    assert login_art.status_code == 200
    assert login_art.json()["name"] == "Sita Devi"

    # 2. SHG Leader Offline Sync
    shg_payload = {
        "phone": "9876540004",
        "pin": "9988",
        "name": "Anandi Patel",
        "dialect": "gujarati",
        "role": "shg_leader",
        "id_type": "none",
        "shg_group_name": "सरस्वती सखी मंडल (Saraswati Sakhi Mandal)",
        "shg_member_count": 18,
        "manual_state": "Gujarat",
        "manual_district": "Kutch",
        "manual_cluster": "Kutch Embroidery Cluster",
        "craft_category": "कच्छ कढ़ाई (Kutch Embroidery)",
    }
    res_shg_sync = await client.post("/api/v1/auth/onboarding/sync", json=shg_payload)
    assert res_shg_sync.status_code in (
        200,
        201,
    ), f"SHG Sync failed: {res_shg_sync.text}"
    shg_data = res_shg_sync.json()
    assert shg_data["is_onboarded"] is True
    assert shg_data["role"] == "shg_leader"
    assert shg_data["cluster_name"] == "Kutch Embroidery Cluster"
    assert "access_token" in shg_data

    # Verify SHG Leader DB persistence
    stmt = select(Artisan).where(Artisan.phone == "9876540004")
    db_res = await db_session.execute(stmt)
    shg_artisan = db_res.scalar_one_or_none()
    assert shg_artisan is not None
    assert shg_artisan.shg_group_name == "सरस्वती सखी मंडल (Saraswati Sakhi Mandal)"
    assert shg_artisan.shg_member_count == 18
    assert shg_artisan.district == "Kutch"


# ============================================================================
# FLOW 4: Security & Edge Cases (Rejection, Validation, and Fallback Robustness)
# ============================================================================


@pytest.mark.asyncio
async def test_flow_4_security_edge_cases_e2e(client: AsyncClient):
    """
    Flow 4 (Security & Edge Cases):
    1. Duplicate Phone Rejection on Step 1 & Sync
    2. Invalid PIN Rejection (<4 digits, >4 digits, non-numeric)
    3. Invalid Phone Rejection (<10 digits, >10 digits, non-numeric)
    4. Unregistered ID Fallback (graceful degradation without crash)
    5. Missing Required Government ID Number Validation
    6. Non-Existent Artisan ID Rejection (404)
    7. Wrong PIN Login Rejection (401)
    """
    existing_phone = "9876540005"
    pin = "7788"

    # Setup: Complete an onboarding flow first
    s1 = await client.post(
        "/api/v1/auth/onboarding/step1",
        json={
            "phone": existing_phone,
            "pin": pin,
            "dialect": "hindi",
            "role": "artisan",
        },
    )
    assert s1.status_code in (200, 201)
    art_id = s1.json()["artisan_id"]

    await client.post(
        "/api/v1/auth/onboarding/step2",
        json={
            "artisan_id": art_id,
            "id_type": "none",
            "manual_cluster": "Varanasi Handloom",
        },
    )
    await client.post(
        "/api/v1/auth/onboarding/step3",
        json={"artisan_id": art_id, "name": "Existing Artisan"},
    )

    # 1. Duplicate phone rejection on Step 1
    res_dup_s1 = await client.post(
        "/api/v1/auth/onboarding/step1",
        json={
            "phone": existing_phone,
            "pin": "9999",
            "dialect": "hindi",
            "role": "artisan",
        },
    )
    assert res_dup_s1.status_code == 400
    assert "already registered" in res_dup_s1.json()["detail"].lower()

    # 2. Duplicate phone rejection on /onboarding/sync
    res_dup_sync = await client.post(
        "/api/v1/auth/onboarding/sync",
        json={
            "phone": existing_phone,
            "pin": "9999",
            "name": "Duplicate Artisan",
            "role": "artisan",
        },
    )
    assert res_dup_sync.status_code == 400
    assert "already registered" in res_dup_sync.json()["detail"].lower()

    # 3. Invalid PIN validations (< 4 digits, > 4 digits, alpha)
    res_short_pin = await client.post(
        "/api/v1/auth/onboarding/step1",
        json={
            "phone": "9876540099",
            "pin": "12",
            "dialect": "hindi",
            "role": "artisan",
        },
    )
    assert res_short_pin.status_code == 422

    res_long_pin = await client.post(
        "/api/v1/auth/onboarding/step1",
        json={
            "phone": "9876540099",
            "pin": "1234567",
            "dialect": "hindi",
            "role": "artisan",
        },
    )
    assert res_long_pin.status_code == 422

    res_alpha_pin = await client.post(
        "/api/v1/auth/onboarding/step1",
        json={
            "phone": "9876540099",
            "pin": "abcd",
            "dialect": "hindi",
            "role": "artisan",
        },
    )
    assert res_alpha_pin.status_code == 422

    # 4. Invalid Phone validations (< 10 digits, > 10 digits, alpha)
    res_short_phone = await client.post(
        "/api/v1/auth/onboarding/step1",
        json={"phone": "98765", "pin": "1234", "dialect": "hindi", "role": "artisan"},
    )
    assert res_short_phone.status_code == 422

    res_long_phone = await client.post(
        "/api/v1/auth/onboarding/step1",
        json={
            "phone": "9876543210123",
            "pin": "1234",
            "dialect": "hindi",
            "role": "artisan",
        },
    )
    assert res_long_phone.status_code == 422

    res_alpha_phone = await client.post(
        "/api/v1/auth/onboarding/step1",
        json={
            "phone": "98765abcde",
            "pin": "1234",
            "dialect": "hindi",
            "role": "artisan",
        },
    )
    assert res_alpha_phone.status_code == 422

    # 5. Unregistered ID fallback in Step 2 (Graceful degradation)
    new_init = await client.post(
        "/api/v1/auth/onboarding/step1",
        json={
            "phone": "9876540006",
            "pin": "2233",
            "dialect": "hindi",
            "role": "artisan",
        },
    )
    new_art_id = new_init.json()["artisan_id"]

    res_unreg_id = await client.post(
        "/api/v1/auth/onboarding/step2",
        json={
            "artisan_id": new_art_id,
            "id_type": "pehchan",
            "id_number": "PEH-UNREGISTERED-8888",
            "manual_state": "Bihar",
            "manual_district": "Madhubani",
            "manual_cluster": "Madhubani Painting Cluster",
        },
    )
    assert res_unreg_id.status_code == 200
    unreg_data = res_unreg_id.json()
    assert unreg_data["verified"] is False
    assert unreg_data["cluster_name"] == "Madhubani Painting Cluster"
    assert unreg_data["district"] == "Madhubani"

    # 6. Missing required government ID number in Step 2
    res_missing_id = await client.post(
        "/api/v1/auth/onboarding/step2",
        json={"artisan_id": new_art_id, "id_type": "pehchan", "id_number": ""},
    )
    assert res_missing_id.status_code == 400
    assert "required" in res_missing_id.json()["detail"].lower()

    # 7. Non-existent artisan ID in Step 2 and Step 3
    res_fake_s2 = await client.post(
        "/api/v1/auth/onboarding/step2",
        json={"artisan_id": "non-existent-artisan-uuid", "id_type": "none"},
    )
    assert res_fake_s2.status_code == 404

    res_fake_s3 = await client.post(
        "/api/v1/auth/onboarding/step3",
        json={"artisan_id": "non-existent-artisan-uuid", "name": "Fake"},
    )
    assert res_fake_s3.status_code == 404

    # 8. Wrong PIN login rejection (401 Unauthorized)
    res_wrong_login = await client.post(
        "/api/v1/auth/login",
        json={"phone": existing_phone, "pin": "0000"},
    )
    assert res_wrong_login.status_code == 401
    assert "incorrect" in res_wrong_login.json()["detail"].lower()
