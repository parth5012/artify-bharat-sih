import pytest
from httpx import AsyncClient
from app.core.security import create_access_token
from app.models.artisan import Artisan
from app.models.product import Product
from sqlalchemy.ext.asyncio import AsyncSession

@pytest.mark.asyncio
async def test_get_my_inventory_requires_auth(client: AsyncClient):
    # Calling without token must fail with 401
    res = await client.get("/api/v1/catalog/my-inventory")
    assert res.status_code == 401

@pytest.mark.asyncio
async def test_get_my_inventory_empty_returns_zero(client: AsyncClient, db_session: AsyncSession):
    # Register an artisan
    artisan = Artisan(
        name="Sunita Devi",
        phone="9988776655",
        pin_hash="dummy_hash",
        primary_dialect="bhojpuri",
        cluster_name="Varanasi Cluster",
        state="UP",
        district="Varanasi"
    )
    db_session.add(artisan)
    await db_session.commit()
    await db_session.refresh(artisan)

    token = create_access_token(subject=artisan.id)
    headers = {"Authorization": f"Bearer {token}"}

    res = await client.get("/api/v1/catalog/my-inventory", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_items"] == 0
    assert data["active_listings_count"] == 0
    assert data["drafts_count"] == 0
    assert len(data["inventory"]) == 0

@pytest.mark.asyncio
async def test_get_my_inventory_cross_artisan_forbidden(client: AsyncClient, db_session: AsyncSession):
    token = create_access_token(subject="artisan-user-1", role="artisan")
    headers = {"Authorization": f"Bearer {token}"}

    # Attempting to access another artisan's inventory returns 403
    res = await client.get("/api/v1/catalog/my-inventory?artisan_id=artisan-user-2", headers=headers)
    assert res.status_code == 403

@pytest.mark.asyncio
async def test_get_my_inventory_with_products(client: AsyncClient, db_session: AsyncSession):
    artisan = Artisan(
        name="Ramesh Kumar",
        phone="9911223344",
        pin_hash="dummy_hash",
        primary_dialect="hindi",
        cluster_name="Chanderi Cluster",
        state="MP",
        district="Ashoknagar"
    )
    db_session.add(artisan)
    await db_session.commit()
    await db_session.refresh(artisan)

    prod = Product(
        artisan_id=artisan.id,
        title="Chanderi Pure Silk Saree",
        craft_category="Handloom",
        status="published"
    )
    db_session.add(prod)
    await db_session.commit()

    token = create_access_token(subject=artisan.id)
    headers = {"Authorization": f"Bearer {token}"}

    res = await client.get("/api/v1/catalog/my-inventory", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_items"] == 1
    assert data["active_listings_count"] == 1
    assert data["inventory"][0]["title"] == "Chanderi Pure Silk Saree"

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
