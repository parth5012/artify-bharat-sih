import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_shortcode_passport_resolution():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Standard hyphenated
        res = await client.get("/api/v1/passport/code/A7X-9B2")
        assert res.status_code == 200
        data = res.json()
        assert data["is_authentic"] is True
        assert data["artisan_name"] == "Radha Devi"
        assert data["cluster_name"] == "Varanasi Handloom Cluster"
        assert data["gi_tag_status"] == "Banarasi Brocade & Saree (GI-39)"
        assert data["cost_breakdown"]["raw_material_cost"] == 3200.0
        assert data["cost_breakdown"]["calculated_fair_wage"] == 4800.0
        assert data["cost_breakdown"]["total_suggested_price"] == 9800.0

        # Lowercase and unhyphenated (robustness check for rural buyers)
        res_norm = await client.get("/api/v1/passport/code/a7x9b2")
        assert res_norm.status_code == 200
        assert res_norm.json()["artisan_name"] == "Radha Devi"

        # Multi-cluster showcase: Madhubani
        res_mdb = await client.get("/api/v1/passport/code/M3B-77L")
        assert res_mdb.status_code == 200
        assert res_mdb.json()["artisan_name"] == "Geeta Jha"
        assert "Mithila" in res_mdb.json()["cluster_name"]

