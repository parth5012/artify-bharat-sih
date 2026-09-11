"""
backend/tests/test_mosje_eshram_auth.py
Covers e-KYC registration/login, e-Shram UAN validation, MoSJE / PM-SURAJ
verification (Task 1.6).
"""
import pytest

pytestmark = pytest.mark.asyncio


async def _register_payload(**overrides):
    payload = {
        "name": "Radha Devi",
        "phone": "+919876543210",
        "pin": "4821",
        "primary_dialect": "bhojpuri",
        "role": "artisan",
        "pehchan_id": "UP-VAR-102938",
        "trifed_id": "TRIFED-UP-7721",
        "eshram_uan": "123456789012",
        "cluster_name": "Varanasi Handloom Cluster",
        "state": "Uttar Pradesh",
        "district": "Varanasi",
    }
    payload.update(overrides)
    return payload


async def test_register_success(client):
    resp = await client.post("/api/v1/auth/register", json=await _register_payload())
    assert resp.status_code == 201
    body = resp.json()
    assert body["artisan_id"].startswith("art_")
    assert body["access_token"]


async def test_register_duplicate_phone_rejected(client):
    payload = await _register_payload()
    r1 = await client.post("/api/v1/auth/register", json=payload)
    assert r1.status_code == 201
    r2 = await client.post("/api/v1/auth/register", json=payload)
    assert r2.status_code == 409


async def test_register_rejects_non_numeric_pin(client):
    payload = await _register_payload(pin="ab12")
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 422


async def test_login_success_and_wrong_pin(client):
    payload = await _register_payload()
    await client.post("/api/v1/auth/register", json=payload)

    ok = await client.post(
        "/api/v1/auth/login", json={"phone": payload["phone"], "pin": payload["pin"]}
    )
    assert ok.status_code == 200
    assert ok.json()["access_token"]

    bad = await client.post(
        "/api/v1/auth/login", json={"phone": payload["phone"], "pin": "0000"}
    )
    assert bad.status_code == 401


async def test_verify_artisan_id_valid_pehchan_format(client):
    resp = await client.post(
        "/api/v1/auth/verify-artisan-id",
        json={"pehchan_id": "UP-VAR-102938", "trifed_id": "TRIFED-UP-7721"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["pehchan_valid"] is True
    assert body["trifed_valid"] is True


async def test_verify_artisan_id_rejects_malformed_pehchan(client):
    resp = await client.post(
        "/api/v1/auth/verify-artisan-id",
        json={"pehchan_id": "not-a-valid-id", "trifed_id": None},
    )
    assert resp.status_code == 422


async def test_mosje_verify_returns_stable_deterministic_result(client):
    r1 = await client.post(
        "/api/v1/auth/mosje-verify",
        json={"artisan_id": "art_vns_001", "pehchan_id": "UP-VAR-102938", "eshram_uan": "123456789012"},
    )
    r2 = await client.post(
        "/api/v1/auth/mosje-verify",
        json={"artisan_id": "art_vns_001", "pehchan_id": "UP-VAR-102938", "eshram_uan": "123456789012"},
    )
    assert r1.status_code == 200 and r2.status_code == 200
    assert r1.json() == r2.json()  # deterministic sandbox mock, stable per artisan_id
    assert r1.json()["pmdaksh_certified"] is True


async def test_eshram_lookup_valid_uan(client):
    resp = await client.post("/api/v1/auth/eshram-lookup", json={"eshram_uan": "123456789012"})
    assert resp.status_code == 200
    assert resp.json()["registered"] is True


async def test_eshram_lookup_rejects_short_uan(client):
    resp = await client.post("/api/v1/auth/eshram-lookup", json={"eshram_uan": "12345"})
    assert resp.status_code == 422


async def test_pmsuraj_lookup(client):
    resp = await client.post(
        "/api/v1/auth/pmsuraj-lookup", json={"eshram_uan": "123456789012", "pehchan_id": None}
    )
    assert resp.status_code == 200
    assert "eligible" in resp.json()
