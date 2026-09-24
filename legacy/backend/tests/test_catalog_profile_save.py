import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product

REGISTER_PAYLOAD = {
    "name": "Sunita Devi",
    "phone": "9988776655",
    "pin": "1234",
    "primary_dialect": "bhojpuri",
    "state": "Uttar Pradesh",
    "district": "Varanasi",
    "cluster_name": "Varanasi Handloom Cluster",
}


async def _register(client: AsyncClient) -> dict:
    res = await client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    assert res.status_code == 201
    return res.json()


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_register_token_usable_on_my_inventory(client: AsyncClient):
    data = await _register(client)
    res = await client.get(
        "/api/v1/catalog/my-inventory", headers=_auth(data["access_token"])
    )
    assert res.status_code == 200
    body = res.json()
    assert body["total_items"] == 0
    assert body["inventory"] == []


@pytest.mark.asyncio
async def test_create_product_draft_requires_auth(client: AsyncClient):
    res = await client.post(
        "/api/v1/catalog/drafts",
        json={"title": "Chanderi Saree", "craft_category": "handloom"},
    )
    assert res.status_code == 401
    assert res.json()["detail"] == "Authentication token required."


@pytest.mark.asyncio
async def test_create_product_draft_returns_201_inventory_item(client: AsyncClient):
    data = await _register(client)
    res = await client.post(
        "/api/v1/catalog/drafts",
        json={"title": "Chanderi Saree", "craft_category": "handloom"},
        headers=_auth(data["access_token"]),
    )
    assert res.status_code == 201
    body = res.json()
    assert body["product_id"]
    assert body["title"] == "Chanderi Saree"
    assert body["craft_category"] == "handloom"
    assert body["status"] == "draft"
    assert body["published_channels"] == ["Draft"]


@pytest.mark.asyncio
async def test_draft_then_patch_catalog_chain_persists(
    client: AsyncClient, db_session: AsyncSession
):
    data = await _register(client)
    headers = _auth(data["access_token"])

    create_res = await client.post(
        "/api/v1/catalog/drafts",
        json={"title": "Bhagalpuri Silk Saree", "craft_category": "handloom"},
        headers=headers,
    )
    assert create_res.status_code == 201
    product_id = create_res.json()["product_id"]

    patch_res = await client.patch(
        f"/api/v1/catalog/products/{product_id}",
        json={
            "title": "Bhagalpuri Silk Saree",
            "description": "Hand-woven Bhagalpuri silk saree with natural dyes.",
            "craft_category": "handloom",
            "material": "Mulberry silk",
            "estimated_days": 7,
            "seo_tags": ["bhagalpuri", "silk"],
        },
        headers=headers,
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "cataloged"
    assert patch_res.json()["product_id"] == product_id

    row = (
        await db_session.execute(select(Product).where(Product.id == product_id))
    ).scalar_one()
    assert row.status == "cataloged"
    assert row.description == "Hand-woven Bhagalpuri silk saree with natural dyes."
    assert row.craft_category == "handloom"
    assert row.seo_tags == ["bhagalpuri", "silk"]
    assert row.artisan_id == data["artisan_id"]


@pytest.mark.asyncio
async def test_patch_unknown_product_returns_legacy_404_detail(client: AsyncClient):
    data = await _register(client)
    res = await client.patch(
        "/api/v1/catalog/products/prod-missing-000",
        json={
            "title": "Any",
            "description": "Any",
            "craft_category": "handloom",
            "seo_tags": [],
        },
        headers=_auth(data["access_token"]),
    )
    assert res.status_code == 404
    assert (
        res.json()["detail"]
        == "Product not found. Please run Studio enhancement again."
    )


@pytest.mark.asyncio
async def test_patch_without_token_returns_legacy_401_detail(client: AsyncClient):
    res = await client.patch(
        "/api/v1/catalog/products/prod-missing-000",
        json={
            "title": "Any",
            "description": "Any",
            "craft_category": "handloom",
            "seo_tags": [],
        },
    )
    assert res.status_code == 401
    assert res.json()["detail"] == "Authentication token required."


@pytest.mark.asyncio
async def test_duplicate_register_detail_supports_login_fallback(client: AsyncClient):
    await _register(client)
    res = await client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    assert res.status_code == 400
    detail = res.json()["detail"]
    assert "already registered" in detail

    login = await client.post(
        "/api/v1/auth/login",
        json={"phone": REGISTER_PAYLOAD["phone"], "pin": REGISTER_PAYLOAD["pin"]},
    )
    assert login.status_code == 200
    assert "access_token" in login.json()
