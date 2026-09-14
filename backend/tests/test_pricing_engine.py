import pytest
import io
from httpx import AsyncClient
from app.services.pricing_service import pricing_service


def test_pricing_service_logic():
    res = pricing_service.calculate_pricing(
        raw_material_cost=500.0,
        labor_days=15.0,
        visual_complexity=0.8,
        craft_category="handloom",
        daily_wage_rate=450.0,
    )
    breakdown = res["cost_breakdown"]
    assert breakdown["raw_material_cost"] == 500.0
    assert breakdown["calculated_fair_wage"] == 15.0 * 450.0  # 6750.0
    assert res["recommended_price"] > 7250.0
    assert breakdown["artisan_net_profit"] > 0
    assert res["benchmark_max_price"] > res["benchmark_min_price"]


@pytest.mark.asyncio
async def test_pricing_api_endpoint(client: AsyncClient):
    # Setup artisan + product
    reg = await client.post(
        "/api/v1/auth/register",
        json={"name": "Pricing Tester", "phone": "9123456780", "pin": "5555"},
    )
    artisan_id = reg.json()["artisan_id"]
    access_token = reg.json()["access_token"]

    from tests.test_cv_enhancement import create_dummy_image_bytes
    files = {"image": ("craft.jpg", io.BytesIO(create_dummy_image_bytes()), "image/jpeg")}
    data = {"artisan_id": artisan_id, "product_title": "Pashmina Shawl"}
    enhance_res = await client.post(
        "/api/v1/studio/enhance",
        data=data,
        files=files,
        headers={"Authorization": f"Bearer {access_token}"},
    )
    product_id = enhance_res.json()["product_id"]

    # Calculate pricing
    pricing_payload = {
        "product_id": product_id,
        "raw_material_cost": 800.0,
        "labor_days": 10.0,
        "daily_wage_rate": 450.0,
    }
    res = await client.post("/api/v1/pricing/calculate", json=pricing_payload)
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["recommended_price"] > 0
    assert res_data["cost_breakdown"]["calculated_fair_wage"] == 4500.0
    assert res_data["cost_breakdown"]["raw_material_cost"] == 800.0
    assert res_data["benchmark_max_price"] >= res_data["benchmark_min_price"]



def test_statutory_wage_floor_enforcement():
    # If predatory wage (e.g. Rs. 150/day) is passed, must clamp to statutory minimum (Rs. 450/day)
    res = pricing_service.calculate_pricing(
        raw_material_cost=300.0,
        labor_days=4.0,
        daily_wage_rate=150.0  # Underpriced rate
    )
    assert res["wage_floor_enforced"] is True
    assert res["cost_breakdown"]["daily_wage_rate"] == 450.0
    assert res["cost_breakdown"]["calculated_fair_wage"] == 4.0 * 450.0  # 1800.0
    assert res["statutory_floor_price"] > 2100.0
    assert res["bulk_wholesale_price"] >= res["statutory_floor_price"]

