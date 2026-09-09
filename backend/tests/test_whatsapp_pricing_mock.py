import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


from app.core.security import create_access_token
from app.models.artisan import Artisan
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_whatsapp_send_alert_endpoint(client: AsyncClient, db_session: AsyncSession):
    """Test WhatsApp Notification integration route (/api/v1/whatsapp/send-alert) with authentication and authorization"""
    # 1. Calling without auth token must fail with 401
    payload = {
        "recipient_phone": "+919876543210",
        "message_body": "Namaste Radha Devi! Your handmade craft has an active order.",
        "alert_type": "FIRST_MILE_DROPOFF",
        "order_id": "ORD-2026-9011",
        "tracking_pin": "549210",
    }
    res_no_auth = await client.post("/api/v1/whatsapp/send-alert", json=payload)
    assert res_no_auth.status_code == 401

    # 2. Register artisan with phone 9876543210
    artisan = Artisan(
        name="Radha Devi",
        phone="9876543210",
        pin_hash="dummy_hash",
        primary_dialect="bhojpuri",
        cluster_name="Varanasi Cluster",
        state="UP",
        district="Varanasi",
    )
    db_session.add(artisan)
    await db_session.commit()
    await db_session.refresh(artisan)

    token = create_access_token(subject=artisan.id, role="artisan")
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Attempting to send to an unauthorized recipient phone returns 403
    unauth_payload = {
        "recipient_phone": "+919999988888",
        "message_body": "Spam / Unauthorized recipient",
        "alert_type": "FIRST_MILE_DROPOFF",
    }
    res_unauth = await client.post("/api/v1/whatsapp/send-alert", json=unauth_payload, headers=headers)
    assert res_unauth.status_code == 403

    # 4. Valid authorized recipient phone matching authenticated artisan
    res = await client.post("/api/v1/whatsapp/send-alert", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["recipient_phone"] == "+919876543210"
    assert "message_id" in data and data["message_id"] is not None
    assert data["status"] in ("sent", "simulated_sandbox", "queued_meta_sandbox", "queued_offline")
    assert data["details"]["alert_type"] == "FIRST_MILE_DROPOFF"



@pytest.mark.asyncio
async def test_fair_wage_dynamic_pricing_haryana_floor():
    """Test Fair-Wage Dynamic Pricing Engine with Haryana statutory wage floor (₹85/hr)"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "raw_material_cost": 400.0,
            "labor_hours": 8.0,
            "state_code": "HR",
            "is_gi_tagged": False,
            "craft_category": "handloom",
            "visual_complexity": 0.80,
        }
        res = await ac.post("/api/v1/calculate-price", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["state_code"] == "HR"
        assert data["state_name"] == "Haryana"
        assert data["hourly_wage_rate"] == 85.0
        assert data["statutory_floor_enforced"] is True
        assert data["gi_heritage_multiplier"] == 1.0

        breakdown = data["cost_breakdown"]
        assert breakdown["raw_material_cost"] == 400.0
        assert breakdown["labor_hours"] == 8.0
        # 8 hrs * ₹85/hr = ₹680.0 fair labor wage
        assert breakdown["calculated_fair_wage"] == 680.0
        assert breakdown["packaging_overhead"] >= 150.0
        assert breakdown["artisan_net_profit"] > 0
        assert data["fair_retail_price"] >= data["statutory_floor_price"]
        assert data["bulk_wholesale_price"] >= data["statutory_floor_price"]
        assert data["direct_realization_percent"] > 50.0


@pytest.mark.asyncio
async def test_fair_wage_pricing_gi_heritage_multiplier():
    """Test GI-tagged 1.15x heritage multiplier boost on craft pricing"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Request with standard non-GI
        base_res = await ac.post("/api/v1/calculate-price", json={
            "raw_material_cost": 500.0,
            "labor_hours": 10.0,
            "state_code": "UP",
            "is_gi_tagged": False,
            "craft_category": "handloom",
        })
        base_data = base_res.json()

        # Request with GI-tagged authentication
        gi_res = await ac.post("/api/v1/calculate-price", json={
            "raw_material_cost": 500.0,
            "labor_hours": 10.0,
            "state_code": "UP",
            "is_gi_tagged": True,
            "craft_category": "handloom",
        })
        gi_data = gi_res.json()

        assert gi_data["is_gi_tagged"] is True
        assert gi_data["gi_heritage_multiplier"] == 1.15
        assert gi_data["fair_retail_price"] > base_data["fair_retail_price"]
        assert gi_data["artisan_net_profit"] > base_data["artisan_net_profit"]


@pytest.mark.asyncio
async def test_mock_eshram_kyc_verification():
    """Test Mock e-Shram & MoSJE Sandbox KYC verification endpoint"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "uan_number": "1009-8876-5432",
            "aadhaar_last_four": "8832",
            "artisan_name": "Radha Devi",
            "state": "Haryana",
        }
        res = await ac.post("/api/v1/mock/auth/eshram-kyc", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["is_verified"] is True
        assert data["uan_number"] == "1009-8876-5432"
        assert data["artisan_name"] == "Radha Devi"
        assert data["kyc_status"] == "AADHAAR_ESHRAM_LINKED_VERIFIED"
        assert len(data["active_schemes"]) >= 4
        scheme_codes = [s["scheme_code"] for s in data["active_schemes"]]
        assert "PM-DAKSH-2026" in scheme_codes
        assert "PM-SURAJ-CREDIT" in scheme_codes
        assert "PMSYM-PENSION" in scheme_codes
        assert "PEHCHAN-CARD" in scheme_codes
        assert data["total_potential_annual_benefit_inr"] > 50000.0
        assert data["direct_payout_escrow_account"]["dbt_linked"] == "YES"


@pytest.mark.asyncio
async def test_mock_logistics_pin_generation():
    """Test Mock Logistics India Post & CSC drop-off pin generation"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "order_id": "ORD-2026-9081",
            "artisan_id": "ART-HR-9921",
            "origin_pincode": "122001",
            "destination_pincode": "110001",
            "weight_grams": 850,
        }
        res = await ac.post("/api/v1/mock/logistics/generate-pin", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["order_id"] == "ORD-2026-9081"
        assert data["artisan_id"] == "ART-HR-9921"
        assert len(data["dropoff_tracking_pin"]) == 6
        assert data["dropoff_tracking_pin"].isdigit()
        assert data["speed_post_awb"].startswith("EK") and data["speed_post_awb"].endswith("IN")
        assert data["nearest_csc_center_id"] == "CSC-HR-GGM-014"
        assert "Gurugram" in data["nearest_center_name"]
        assert data["distance_km"] > 0
        assert data["contact_person_vle"] is not None
        assert data["dropoff_deadline_hours"] == 48
