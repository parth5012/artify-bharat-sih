import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_and_login_artisan(client: AsyncClient):
    # 1. Register new artisan
    register_payload = {
        "name": "Gauri Devi",
        "phone": "9876543210",
        "pin": "1234",
        "primary_dialect": "bhojpuri",
        "state": "Uttar Pradesh",
        "district": "Varanasi",
        "cluster_name": "Varanasi Handloom Cluster",
        "trifed_id": "TRIFED-UP-VNS-1049",
        "pehchan_id": "PEH-IND-88320",
        "geo_lat": 25.3176,
        "geo_lng": 82.9739,
    }

    res = await client.post("/api/v1/auth/register", json=register_payload)
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert data["name"] == "Gauri Devi"
    assert data["phone"] == "9876543210"

    # 2. Duplicate registration check
    res_dup = await client.post("/api/v1/auth/register", json=register_payload)
    assert res_dup.status_code == 400

    # 3. Successful PIN login
    login_payload = {
        "phone": "9876543210",
        "pin": "1234",
    }
    res_login = await client.post("/api/v1/auth/login", json=login_payload)
    assert res_login.status_code == 200
    login_data = res_login.json()
    assert "access_token" in login_data

    # 4. Incorrect PIN check
    res_bad_pin = await client.post("/api/v1/auth/login", json={"phone": "9876543210", "pin": "9999"})
    assert res_bad_pin.status_code == 401
