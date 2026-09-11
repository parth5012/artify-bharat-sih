"""
backend/tests/test_logistics_payout.py
Covers India Post dispatch + tracking, 0% middleman Jan Dhan direct payout,
and Bhashini IVR voice alert dispatch (Task 5.8).
"""
import pytest

pytestmark = pytest.mark.asyncio


async def test_dispatch_generates_tracking_id_and_barcode(client):
    resp = await client.post(
        "/api/v1/logistics/india-post/dispatch",
        json={
            "order_id": "order_9918",
            "artisan_id": "art_vns_001",
            "product_id": "prod_9918",
            "origin_pin": "221001",
            "destination_pin": "110001",
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["tracking_id"].startswith("IP") and body["tracking_id"].endswith("IN")
    assert body["barcode_code128"]
    assert body["status"] == "LABEL_CREATED"


async def test_track_unknown_tracking_id_404s(client):
    resp = await client.get("/api/v1/logistics/india-post/track/IP000000000IN")
    assert resp.status_code == 404


async def test_track_returns_milestone_timeline(client):
    dispatch = await client.post(
        "/api/v1/logistics/india-post/dispatch",
        json={
            "order_id": "order_1",
            "artisan_id": "art_vns_001",
            "origin_pin": "221001",
            "destination_pin": "110001",
        },
    )
    tracking_id = dispatch.json()["tracking_id"]
    resp = await client.get(f"/api/v1/logistics/india-post/track/{tracking_id}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["milestones"][0]["status"] == "LABEL_CREATED"


async def test_direct_transfer_zero_percent_fee(client):
    resp = await client.post(
        "/api/v1/payouts/direct-transfer",
        json={
            "artisan_id": "art_vns_001",
            "order_id": "order_9918",
            "product_id": "prod_9918",
            "amount": 9800.00,
            "channel": "PFMS_DBT",
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["utr_number"].startswith("UTR")
    assert body["platform_fee_pct"] == 0.0
    assert body["net_amount"] == pytest.approx(9800.00)
    assert body["status"] == "SETTLED"


async def test_payout_history_lists_transactions_with_total(client):
    for i in range(3):
        await client.post(
            "/api/v1/payouts/direct-transfer",
            json={
                "artisan_id": "art_vns_history",
                "order_id": f"order_{i}",
                "amount": 1000.00,
                "channel": "UPI",
            },
        )
    resp = await client.get("/api/v1/payouts/history/art_vns_history")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["transactions"]) == 3
    assert body["total_disbursed"] == pytest.approx(3000.00)


async def test_notify_send_dispatch(client):
    resp = await client.post(
        "/api/v1/notify/send",
        json={
            "artisan_id": "art_vns_001",
            "event_type": "ORDER_DISPATCH",
            "dialect": "bhojpuri",
            "context": {"order_id": "order_9918"},
        },
    )
    assert resp.status_code == 202
    body = resp.json()
    assert body["call_id"].startswith("call_")
    assert body["status"] in ("QUEUED", "DISPATCHED")
    assert body["dialect"] == "bhojpuri"


async def test_notify_send_payment_credited(client):
    resp = await client.post(
        "/api/v1/notify/send",
        json={
            "artisan_id": "art_vns_001",
            "event_type": "PAYMENT_CREDITED",
            "dialect": "bhojpuri",
            "context": {"amount": 9800},
        },
    )
    assert resp.status_code == 202
