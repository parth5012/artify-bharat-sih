import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_district_heatmap():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/admin/district-heatmap")
        assert res.status_code == 200
        data = res.json()
        assert data["total_districts_monitored"] >= 5
        assert data["total_wages_disbursed_inr"] > 0
        assert data["average_middleman_savings_percent"] > 30.0

@pytest.mark.asyncio
async def test_admin_audit_logs():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/admin/audit-logs")
        assert res.status_code == 200
        data = res.json()
        assert data["total_logs"] >= 3

@pytest.mark.asyncio
async def test_admin_pmdaksh_metrics():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/admin/pmdaksh-metrics")
        assert res.status_code == 200
        data = res.json()
        assert data["total_enrolled"] > 0
        assert data["average_wage_increase_percent"] > 40.0

@pytest.mark.asyncio
async def test_admin_demand_forecast():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/admin/demand-forecast?cluster=Varanasi%20Handloom%20Cluster")
        assert res.status_code == 200
        data = res.json()
        assert len(data["forecast_items"]) >= 3
        assert data["confidence_score"] >= 0.9
