import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_verify_pehchan_id_valid(client: AsyncClient):
    payload = {
        "identifier_type": "pehchan",
        "identifier_value": "PEH-IND-88320"
    }
    res = await client.post("/api/v1/auth/verify-artisan-id", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is True
    assert data["artisan_name"] == "Gauri Devi"
    assert data["gi_certified"] is True
    assert "Banarasi" in data["gi_tag_name"]

@pytest.mark.asyncio
async def test_verify_trifed_id_valid(client: AsyncClient):
    payload = {
        "identifier_type": "trifed",
        "identifier_value": "TRIFED-BR-MDB-2201"
    }
    res = await client.post("/api/v1/auth/verify-artisan-id", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is True
    assert data["artisan_name"] == "Sita Devi"
    assert "Madhubani" in data["cluster_name"]

@pytest.mark.asyncio
async def test_verify_unregistered_prefix_fails(client: AsyncClient):
    # Tests that prefix shortcuts like PEH-FAKE or TRIFED-UNKNOWN do NOT return True
    payload = {
        "identifier_type": "pehchan",
        "identifier_value": "PEH-FAKE-99999"
    }
    res = await client.post("/api/v1/auth/verify-artisan-id", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is False
    assert data["gi_certified"] is False

@pytest.mark.asyncio
async def test_verify_invalid_artisan_id(client: AsyncClient):
    payload = {
        "identifier_type": "unknown",
        "identifier_value": "INVALID-ID-0000"
    }
    res = await client.post("/api/v1/auth/verify-artisan-id", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is False
