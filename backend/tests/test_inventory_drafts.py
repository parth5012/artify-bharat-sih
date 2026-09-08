import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_get_my_inventory_endpoint(client: AsyncClient):
    res = await client.get("/api/v1/catalog/my-inventory")
    assert res.status_code == 200
    data = res.json()
    assert "total_items" in data
    assert "active_listings_count" in data
    assert "drafts_count" in data
    assert len(data["inventory"]) > 0

@pytest.mark.asyncio
async def test_sync_offline_drafts(client: AsyncClient):
    payload = {
        "artisan_id": "test-artisan-100",
        "drafts": [
            {
                "local_draft_id": "draft_01",
                "product_title": "Chanderi Handloom Saree",
                "craft_category": "handloom",
                "raw_cost": 450.0,
                "labor_days": 6.0,
                "dialect": "hindi"
            },
            {
                "local_draft_id": "draft_02",
                "product_title": "Kashmir Pashmina Stole",
                "craft_category": "pashmina",
                "raw_cost": 1200.0,
                "labor_days": 12.0,
                "dialect": "kashmiri"
            }
        ]
    }
    res = await client.post("/api/v1/catalog/drafts/sync", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["synced_count"] == 2
    assert "draft_01" in data["synced_draft_ids"]
    assert "draft_02" in data["synced_draft_ids"]
    assert data["status"] == "success"
