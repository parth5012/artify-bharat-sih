import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_india_post_dispatch_and_tracking():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "order_id": "ord_gem_1102",
            "artisan_id": "artisan_123",
            "pickup_pincode": "221001",
            "delivery_pincode": "110001",
            "weight_grams": 750
        }
        res = await client.post("/api/v1/logistics/india-post/dispatch", json=payload)
        assert res.status_code == 200
        data = res.json()
        tracking_id = data["tracking_id"]
        assert tracking_id.startswith("IP")
        assert "INPOST" in data["barcode_data"]
        
        # Test tracking
        res_track = await client.get(f"/api/v1/logistics/india-post/track/{tracking_id}")
        assert res_track.status_code == 200
        assert res_track.json()["current_status"] == "OUT_FOR_PICKUP"

@pytest.mark.asyncio
async def test_direct_jandhan_payout():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "order_id": "ord_gem_1102",
            "artisan_id": "artisan_123",
            "amount_inr": 9800.0,
            "payout_channel": "JAN_DHAN_DIRECT",
            "upi_id_or_account": "radhadevi@sbi"
        }
        res = await client.post("/api/v1/payouts/direct-transfer", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "SETTLED_INSTANT"
        assert data["middleman_commission_inr"] == 0.0
        assert data["amount_inr"] == 9800.0
        assert data["utr_number"].startswith("UTR")

@pytest.mark.asyncio
async def test_notification_ivr_engine():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "artisan_id": "artisan_123",
            "phone_number": "+919876543210",
            "channel": "IVR_VOICE",
            "dialect": "bhojpuri",
            "event_type": "NEW_ORDER",
            "order_id": "ord_gem_1102"
        }
        res = await client.post("/api/v1/notify/send", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "DISPATCHED"
        assert "ivr" in data["audio_stream_url"]

@pytest.mark.asyncio
async def test_csc_dropoff_pin():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/v1/logistics/csc-dropoff-pin?order_id=ord_gem_1102&artisan_id=artisan_123&village_pincode=221001")
        assert res.status_code == 200
        data = res.json()
        assert "dropoff_pin" in data
        assert len(data["dropoff_pin"]) == 7  # XXX-XXX
        assert data["status"] == "PIN_ACTIVE_READY_FOR_DROPOFF"
        assert "CSC" in data["csc_centre_name"]


@pytest.mark.asyncio
async def test_notification_whatsapp_channel():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "artisan_id": "artisan_123",
            "phone_number": "+919876543210",
            "channel": "WHATSAPP",
            "dialect": "hindi",
            "event_type": "NEW_ORDER",
            "order_id": "ord_gem_1102"
        }
        res = await client.post("/api/v1/notify/send", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "DISPATCHED"
        assert data["recipient_phone"] == "+919876543210"
        assert data["whatsapp_meta_response"] is not None
        assert data["whatsapp_meta_response"]["success"] is True


