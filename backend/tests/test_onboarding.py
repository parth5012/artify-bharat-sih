import base64
import os
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
    monkeypatch.setenv("PII_VAULT_KEY", _test_key_b64())
    yield _test_key_b64()


@pytest.mark.asyncio
async def test_step1_artisan_initiation(client: AsyncClient):
    payload = {
        "phone": "9876500001",
        "pin": "1234",
        "dialect": "hindi",
        "role": "artisan",
    }
    res = await client.post("/api/v1/auth/onboarding/step1", json=payload)
    assert res.status_code in (200, 201)
    data = res.json()
    assert "session_token" in data
    assert "artisan_id" in data
    assert data["phone"] == "9876500001"
    assert data["role"] == "artisan"
    assert data["dialect"] == "hindi"
    assert data["next_step"] == 2


@pytest.mark.asyncio
async def test_step1_shg_leader_initiation(client: AsyncClient):
    payload = {
        "phone": "9876500002",
        "pin": "5678",
        "dialect": "bhojpuri",
        "role": "shg_leader",
    }
    res = await client.post("/api/v1/auth/onboarding/step1", json=payload)
    assert res.status_code in (200, 201)
    data = res.json()
    assert data["role"] == "shg_leader"
    assert data["dialect"] == "bhojpuri"
    assert data["next_step"] == 2


@pytest.mark.asyncio
async def test_step1_validation_errors(client: AsyncClient):
    # Invalid phone (not 10 digits)
    res_bad_phone = await client.post(
        "/api/v1/auth/onboarding/step1",
        json={"phone": "12345", "pin": "1234", "dialect": "hindi", "role": "artisan"},
    )
    assert res_bad_phone.status_code == 422

    # Invalid pin (not 4 digits)
    res_bad_pin = await client.post(
        "/api/v1/auth/onboarding/step1",
        json={
            "phone": "9876500003",
            "pin": "12",
            "dialect": "hindi",
            "role": "artisan",
        },
    )
    assert res_bad_pin.status_code == 422


@pytest.mark.asyncio
async def test_step2_pehchan_verified_autofill(
    client: AsyncClient, db_session: AsyncSession
):
    # Step 1
    s1 = await client.post(
        "/api/v1/auth/onboarding/step1",
        json={
            "phone": "9876500004",
            "pin": "1234",
            "dialect": "hindi",
            "role": "artisan",
        },
    )
    artisan_id = s1.json()["artisan_id"]

    # Step 2 with valid Pehchan ID from master registry
    s2 = await client.post(
        "/api/v1/auth/onboarding/step2",
        json={
            "artisan_id": artisan_id,
            "id_type": "pehchan",
            "id_number": "PEH-IND-88320",
        },
    )
    assert s2.status_code == 200
    data = s2.json()
    assert data["verified"] is True
    assert data["cluster_name"] == "Varanasi Handloom Cluster"
    assert data["state"] == "Uttar Pradesh"
    assert data["district"] == "Varanasi"
    assert data["next_step"] == 3


@pytest.mark.asyncio
async def test_step2_trifed_verified_autofill(client: AsyncClient):
    # Step 1
    s1 = await client.post(
        "/api/v1/auth/onboarding/step1",
        json={
            "phone": "9876500005",
            "pin": "1234",
            "dialect": "hindi",
            "role": "artisan",
        },
    )
    artisan_id = s1.json()["artisan_id"]

    # Step 2 with valid TRIFED ID from master registry
    s2 = await client.post(
        "/api/v1/auth/onboarding/step2",
        json={
            "artisan_id": artisan_id,
            "id_type": "trifed",
            "id_number": "TRIFED-UP-VNS-1049",
        },
    )
    assert s2.status_code == 200
    data = s2.json()
    assert data["verified"] is True
    assert data["cluster_name"] == "Varanasi Handloom Cluster"
    assert data["state"] == "Uttar Pradesh"
    assert data["district"] == "Varanasi"
    assert data["next_step"] == 3


@pytest.mark.asyncio
async def test_step2_eshram_verified(client: AsyncClient):
    # Step 1
    s1 = await client.post(
        "/api/v1/auth/onboarding/step1",
        json={
            "phone": "9876500006",
            "pin": "1234",
            "dialect": "hindi",
            "role": "artisan",
        },
    )
    artisan_id = s1.json()["artisan_id"]

    # Step 2 with 12-digit e-Shram UAN
    s2 = await client.post(
        "/api/v1/auth/onboarding/step2",
        json={
            "artisan_id": artisan_id,
            "id_type": "eshram",
            "id_number": "123456789012",
        },
    )
    assert s2.status_code == 200
    data = s2.json()
    assert data["verified"] is True
    assert data["next_step"] == 3


@pytest.mark.asyncio
async def test_step2_none_manual_fallback(client: AsyncClient):
    # Step 1
    s1 = await client.post(
        "/api/v1/auth/onboarding/step1",
        json={
            "phone": "9876500007",
            "pin": "1234",
            "dialect": "hindi",
            "role": "artisan",
        },
    )
    artisan_id = s1.json()["artisan_id"]

    # Step 2 with id_type='none' and manual location
    s2 = await client.post(
        "/api/v1/auth/onboarding/step2",
        json={
            "artisan_id": artisan_id,
            "id_type": "none",
            "manual_state": "Rajasthan",
            "manual_district": "Jaipur",
            "manual_cluster": "Jaipur Blue Pottery Cluster",
        },
    )
    assert s2.status_code == 200
    data = s2.json()
    assert data["verified"] is False
    assert data["cluster_name"] == "Jaipur Blue Pottery Cluster"
    assert data["state"] == "Rajasthan"
    assert data["district"] == "Jaipur"
    assert data["next_step"] == 3


@pytest.mark.asyncio
async def test_step2_unregistered_id_manual_fallback(client: AsyncClient):
    # Step 1
    s1 = await client.post(
        "/api/v1/auth/onboarding/step1",
        json={
            "phone": "9876500008",
            "pin": "1234",
            "dialect": "hindi",
            "role": "artisan",
        },
    )
    artisan_id = s1.json()["artisan_id"]

    # Step 2 with unrecognized Pehchan ID but manual fallback provided
    s2 = await client.post(
        "/api/v1/auth/onboarding/step2",
        json={
            "artisan_id": artisan_id,
            "id_type": "pehchan",
            "id_number": "PEH-UNKNOWN-99999",
            "manual_state": "Bihar",
            "manual_district": "Madhubani",
            "manual_cluster": "Madhubani Art Cluster",
        },
    )
    assert s2.status_code == 200
    data = s2.json()
    assert data["verified"] is False
    assert data["cluster_name"] == "Madhubani Art Cluster"
    assert data["state"] == "Bihar"
    assert data["district"] == "Madhubani"
    assert data["next_step"] == 3


@pytest.mark.asyncio
async def test_step3_complete_artisan(client: AsyncClient, db_session: AsyncSession):
    # Step 1
    s1 = await client.post(
        "/api/v1/auth/onboarding/step1",
        json={
            "phone": "9876500009",
            "pin": "1234",
            "dialect": "hindi",
            "role": "artisan",
        },
    )
    artisan_id = s1.json()["artisan_id"]

    # Step 2
    await client.post(
        "/api/v1/auth/onboarding/step2",
        json={
            "artisan_id": artisan_id,
            "id_type": "none",
            "manual_cluster": "Varanasi Handloom",
        },
    )

    # Step 3
    s3 = await client.post(
        "/api/v1/auth/onboarding/step3",
        json={
            "artisan_id": artisan_id,
            "name": "Meera Bai",
            "craft_category": "Handloom Weaving",
        },
    )
    assert s3.status_code == 200
    data = s3.json()
    assert "access_token" in data
    assert data["name"] == "Meera Bai"
    assert data["role"] == "artisan"
    assert data["is_onboarded"] is True

    # Check database state
    stmt = select(Artisan).where(Artisan.id == artisan_id)
    res = await db_session.execute(stmt)
    artisan = res.scalar_one_or_none()
    assert artisan is not None
    assert artisan.name == "Meera Bai"
    assert artisan.is_onboarded is True
    assert artisan.onboarding_step == 3


@pytest.mark.asyncio
async def test_step3_complete_shg_leader(client: AsyncClient, db_session: AsyncSession):
    # Step 1 with shg_leader role
    s1 = await client.post(
        "/api/v1/auth/onboarding/step1",
        json={
            "phone": "9876500010",
            "pin": "4321",
            "dialect": "hindi",
            "role": "shg_leader",
        },
    )
    artisan_id = s1.json()["artisan_id"]

    # Step 2
    await client.post(
        "/api/v1/auth/onboarding/step2",
        json={"artisan_id": artisan_id, "id_type": "none"},
    )

    # Step 3 with SHG info
    s3 = await client.post(
        "/api/v1/auth/onboarding/step3",
        json={
            "artisan_id": artisan_id,
            "name": "Sunita Sharma",
            "craft_category": "Zardozi Embroidery",
            "shg_group_name": "Mahila Bunker Samiti",
            "shg_member_count": 15,
        },
    )
    assert s3.status_code == 200
    data = s3.json()
    assert data["role"] == "shg_leader"
    assert data["is_onboarded"] is True

    # Verify DB persistence
    stmt = select(Artisan).where(Artisan.id == artisan_id)
    res = await db_session.execute(stmt)
    artisan = res.scalar_one_or_none()
    assert artisan.shg_group_name == "Mahila Bunker Samiti"
    assert artisan.shg_member_count == 15
    assert artisan.role == "shg_leader"


@pytest.mark.asyncio
async def test_duplicate_phone_handling(client: AsyncClient):
    # Step 1
    s1 = await client.post(
        "/api/v1/auth/onboarding/step1",
        json={
            "phone": "9876500011",
            "pin": "1234",
            "dialect": "hindi",
            "role": "artisan",
        },
    )
    assert s1.status_code in (200, 201)

    # Step 2 & 3 to complete onboarding
    artisan_id = s1.json()["artisan_id"]
    await client.post(
        "/api/v1/auth/onboarding/step2",
        json={"artisan_id": artisan_id, "id_type": "none"},
    )
    await client.post(
        "/api/v1/auth/onboarding/step3",
        json={"artisan_id": artisan_id, "name": "Rajesh Kumar"},
    )

    # Attempt to register again with duplicate phone
    s1_dup = await client.post(
        "/api/v1/auth/onboarding/step1",
        json={
            "phone": "9876500011",
            "pin": "9999",
            "dialect": "hindi",
            "role": "artisan",
        },
    )
    assert s1_dup.status_code in (400, 409)


@pytest.mark.asyncio
async def test_subsequent_pin_login(client: AsyncClient):
    # Complete onboarding
    s1 = await client.post(
        "/api/v1/auth/onboarding/step1",
        json={
            "phone": "9876500012",
            "pin": "5678",
            "dialect": "hindi",
            "role": "artisan",
        },
    )
    artisan_id = s1.json()["artisan_id"]
    await client.post(
        "/api/v1/auth/onboarding/step2",
        json={"artisan_id": artisan_id, "id_type": "none"},
    )
    await client.post(
        "/api/v1/auth/onboarding/step3",
        json={"artisan_id": artisan_id, "name": "Kavita Devi"},
    )

    # Subsequent PIN login
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"phone": "9876500012", "pin": "5678"},
    )
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "access_token" in login_data
    assert login_data["phone"] == "9876500012"
    assert login_data["name"] == "Kavita Devi"


@pytest.mark.asyncio
async def test_offline_draft_sync_artisan(
    client: AsyncClient, db_session: AsyncSession
):
    payload = {
        "phone": "9876500013",
        "pin": "1122",
        "name": "Devi Lal",
        "dialect": "hindi",
        "role": "artisan",
        "id_type": "pehchan",
        "id_number": "PEH-IND-88320",
        "craft_category": "Handloom Textile",
    }
    res = await client.post("/api/v1/auth/onboarding/sync", json=payload)
    assert res.status_code in (200, 201)
    data = res.json()
    assert "access_token" in data
    assert data["name"] == "Devi Lal"
    assert data["role"] == "artisan"
    assert data["is_onboarded"] is True

    # Verify DB
    stmt = select(Artisan).where(Artisan.phone == "9876500013")
    res_db = await db_session.execute(stmt)
    artisan = res_db.scalar_one_or_none()
    assert artisan is not None
    assert artisan.is_onboarded is True
    assert artisan.cluster_name == "Varanasi Handloom Cluster"


@pytest.mark.asyncio
async def test_offline_draft_sync_shg_leader(
    client: AsyncClient, db_session: AsyncSession
):
    payload = {
        "phone": "9876500014",
        "pin": "3344",
        "name": "Anandi Ben",
        "dialect": "gujarati",
        "role": "shg_leader",
        "id_type": "none",
        "shg_group_name": "Saraswati Self Help Group",
        "shg_member_count": 18,
        "manual_state": "Gujarat",
        "manual_district": "Kutch",
        "manual_cluster": "Kutch Embroidery Cluster",
    }
    res = await client.post("/api/v1/auth/onboarding/sync", json=payload)
    assert res.status_code in (200, 201)
    data = res.json()
    assert data["role"] == "shg_leader"
    assert data["is_onboarded"] is True

    # Verify DB
    stmt = select(Artisan).where(Artisan.phone == "9876500014")
    res_db = await db_session.execute(stmt)
    artisan = res_db.scalar_one_or_none()
    assert artisan.shg_group_name == "Saraswati Self Help Group"
    assert artisan.shg_member_count == 18
    assert artisan.cluster_name == "Kutch Embroidery Cluster"


@pytest.mark.asyncio
async def test_pii_vault_protection_in_onboarding(
    client: AsyncClient, db_session: AsyncSession, vault_key: str
):
    # Complete onboarding with Pehchan ID
    s1 = await client.post(
        "/api/v1/auth/onboarding/step1",
        json={
            "phone": "9876500015",
            "pin": "9876",
            "dialect": "hindi",
            "role": "artisan",
        },
    )
    artisan_id = s1.json()["artisan_id"]

    await client.post(
        "/api/v1/auth/onboarding/step2",
        json={
            "artisan_id": artisan_id,
            "id_type": "pehchan",
            "id_number": "PEH-IND-88320",
        },
    )

    await client.post(
        "/api/v1/auth/onboarding/step3",
        json={"artisan_id": artisan_id, "name": "PII Secure Artisan"},
    )

    # Check stored value in database is encrypted token, NOT plaintext
    stmt = select(Artisan).where(Artisan.id == artisan_id)
    res = await db_session.execute(stmt)
    artisan = res.scalar_one_or_none()
    assert artisan is not None
    assert artisan.pehchan_id != "PEH-IND-88320"
    assert is_vault_token(artisan.pehchan_id)
    assert reveal(artisan.pehchan_id) == "PEH-IND-88320"
