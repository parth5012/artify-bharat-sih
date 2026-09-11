import pytest
import io
from httpx import AsyncClient

# Slow: drives the full CV/rembg enhance pipeline end to end. Excluded from the
# CI fast suite with `-m "not slow"`; still runs in local full-suite runs.
pytestmark = pytest.mark.slow


@pytest.mark.asyncio
async def test_multi_channel_export(client: AsyncClient):
    # Setup complete pipeline
    reg = await client.post(
        "/api/v1/auth/register",
        json={"name": "Sita Devi", "phone": "9845098450", "pin": "9900", "trifed_id": "TRIFED-BH-101"},
    )
    artisan_id = reg.json()["artisan_id"]

    from tests.test_cv_enhancement import create_dummy_image_bytes
    files = {"image": ("craft.jpg", io.BytesIO(create_dummy_image_bytes()), "image/jpeg")}
    data = {"artisan_id": artisan_id, "product_title": "Madhubani Silk Dupatta"}
    enhance_res = await client.post("/api/v1/studio/enhance", data=data, files=files)
    product_id = enhance_res.json()["product_id"]

    # Calculate pricing
    await client.post(
        "/api/v1/pricing/calculate",
        json={"product_id": product_id, "raw_material_cost": 400.0, "labor_days": 8.0},
    )

    # Issue passport
    await client.post("/api/v1/passport/issue", json={"product_id": product_id})

    # Export to GeM, ONDC, and B2B
    export_payload = {
        "product_id": product_id,
        "target_channels": ["GeM", "ONDC", "Direct_B2B"],
        "b2b_bulk_min_quantity": 15,
        "b2b_bulk_discount_percentage": 20.0,
    }
    export_res = await client.post("/api/v1/exports/sync", json=export_payload)
    assert export_res.status_code == 200
    exp_data = export_res.json()
    assert len(exp_data["results"]) == 3
    channels = [r["channel"] for r in exp_data["results"]]
    assert "GeM" in channels
    assert "ONDC" in channels
    assert "Direct_B2B" in channels
