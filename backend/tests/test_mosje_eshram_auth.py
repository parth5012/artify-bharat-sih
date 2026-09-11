import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_mosje_scheme_verification():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "artisan_id": "artisan_123",
            "scheme_type": "PM-DAKSH",
            "scheme_registration_number": "DAKSH-2026-UP-8812"
        }
        res = await client.post("/api/v1/auth/mosje-verify", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["verified"] is True
        assert data["scheme_type"] == "PM-DAKSH"
        assert "Master Artisan" in data["skill_certification_level"]

@pytest.mark.asyncio
async def test_eshram_uan_lookup():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "uan_number": "123456789012",
            "mobile_last_4": "4421"
        }
        res = await client.post("/api/v1/auth/eshram-lookup", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["valid"] is True
        assert data["primary_occupation"] == "Handloom Silk Weaver & Artisan"

@pytest.mark.asyncio
async def test_pmsuraj_credit_lookup():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "application_id": "SURAJ-2026-9921"
        }
        res = await client.post("/api/v1/auth/pmsuraj-lookup", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["verified"] is True
        assert data["sanctioned_amount_inr"] == 100000.0
        assert data["credit_status"] == "SANCTIONED_DISBURSED"
