"""Marketplace T2: reserve-only APIs + atomic lock + expiry (issue #88)."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from app.models.artisan import Artisan
from app.models.product import Product
from app.models.reservation import Reservation
from app.services.reserve_service import release_expired

BASE = "/api/v1/marketplace"


def _phone() -> str:
    return "9%09d" % (int(uuid.uuid4().hex[:9], 16) % 1_000_000_000)


async def _artisan(db_session, **kw) -> Artisan:
    params = dict(name="Weaver", phone=_phone(), pin_hash="x")
    params.update(kw)
    artisan = Artisan(**params)
    db_session.add(artisan)
    await db_session.flush()
    return artisan


async def _product(db_session, artisan, **kw) -> Product:
    params = dict(
        artisan_id=artisan.id,
        title="Banarasi Silk",
        status="published",
        stock_qty=1,
        stock_type="unique",
        is_listed=True,
        reserved_qty=0,
    )
    params.update(kw)
    product = Product(**params)
    db_session.add(product)
    await db_session.flush()
    return product


async def test_browse_verified_only(client, db_session):
    artisan = await _artisan(db_session)
    await _product(db_session, artisan, title="Listed")
    await _product(db_session, artisan, title="Hidden", status="draft", is_listed=False)
    await db_session.commit()

    res = await client.get(f"{BASE}/products")
    assert res.status_code == 200
    titles = {i["title"] for i in res.json()["items"]}
    assert "Listed" in titles
    assert "Hidden" not in titles


async def test_browse_search_and_cluster(client, db_session):
    artisan = await _artisan(db_session, cluster_name="Varanasi Handloom Cluster")
    await _product(db_session, artisan, title="Banarasi Silk Saree")
    await _product(db_session, artisan, title="Madhubani Dupatta")
    await db_session.commit()

    res = await client.get(f"{BASE}/products", params={"search": "Banarasi"})
    assert res.status_code == 200
    assert {i["title"] for i in res.json()["items"]} == {"Banarasi Silk Saree"}

    res = await client.get(f"{BASE}/products", params={"cluster": "Varanasi"})
    assert res.status_code == 200
    assert res.json()["count"] >= 2


async def test_reserve_success_pickup_and_expiry(client, db_session):
    artisan = await _artisan(db_session)
    product = await _product(db_session, artisan)
    pid = product.id
    await db_session.commit()

    res = await client.post(
        f"{BASE}/reserve",
        json={
            "product_id": pid,
            "qty": 1,
            "buyer_name": "Buyer",
            "buyer_phone": "9876543210",
            "otp": "123456",
        },
    )
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["pickup_code"] and len(body["pickup_code"]) == 6
    exp = datetime.fromisoformat(body["expires_at"])
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    delta = exp - datetime.now(timezone.utc)
    assert 6 <= delta.days <= 7

    refreshed = (
        await db_session.execute(select(Product).where(Product.id == pid))
    ).scalar_one()
    assert refreshed.reserved_qty == 1


async def test_oversell_blocked_unique_double_reserve(client, db_session):
    artisan = await _artisan(db_session)
    product = await _product(db_session, artisan)
    await db_session.commit()

    first = await client.post(
        f"{BASE}/reserve",
        json={
            "product_id": product.id,
            "qty": 1,
            "buyer_name": "A",
            "buyer_phone": "9876543210",
            "otp": "654321",
        },
    )
    assert first.status_code == 201
    second = await client.post(
        f"{BASE}/reserve",
        json={
            "product_id": product.id,
            "qty": 1,
            "buyer_name": "B",
            "buyer_phone": "9876543211",
            "otp": "123456",
        },
    )
    assert second.status_code == 400
    assert (
        "oversell" in second.json()["detail"].lower()
        or "stock" in second.json()["detail"].lower()
    )


async def test_quantity_stock_blocked(client, db_session):
    artisan = await _artisan(db_session)
    product = await _product(
        db_session, artisan, stock_qty=2, stock_type="quantity", title="QtyItem"
    )
    await db_session.commit()
    res = await client.post(
        f"{BASE}/reserve",
        json={
            "product_id": product.id,
            "qty": 3,
            "buyer_name": "B",
            "buyer_phone": "9876543220",
            "otp": "123456",
        },
    )
    assert res.status_code == 400


async def test_own_product_blocked(client, db_session):
    artisan = await _artisan(db_session, phone="9876543299")
    product = await _product(db_session, artisan)
    await db_session.commit()

    by_id = await client.post(
        f"{BASE}/reserve",
        json={
            "product_id": product.id,
            "qty": 1,
            "buyer_name": "Self",
            "buyer_phone": "9811111111",
            "otp": "123456",
            "artisan_id": artisan.id,
        },
    )
    assert by_id.status_code == 400

    by_phone = await client.post(
        f"{BASE}/reserve",
        json={
            "product_id": product.id,
            "qty": 1,
            "buyer_name": "Self",
            "buyer_phone": "9876543299",
            "otp": "123456",
        },
    )
    assert by_phone.status_code == 400


async def test_five_active_cap(client, db_session):
    artisan = await _artisan(db_session)
    products = [await _product(db_session, artisan, title=f"Cap{i}") for i in range(6)]
    await db_session.commit()

    for i in range(5):
        res = await client.post(
            f"{BASE}/reserve",
            json={
                "product_id": products[i].id,
                "qty": 1,
                "buyer_name": "Buyer",
                "buyer_phone": "9876500000",
                "otp": "123456",
            },
        )
        assert res.status_code == 201, res.text
    sixth = await client.post(
        f"{BASE}/reserve",
        json={
            "product_id": products[5].id,
            "qty": 1,
            "buyer_name": "Buyer",
            "buyer_phone": "9876500000",
            "otp": "123456",
        },
    )
    assert sixth.status_code == 400
    assert "max 5" in sixth.json()["detail"]


async def test_confirm_and_decline_owner_only(client, db_session):
    artisan = await _artisan(db_session)
    other = await _artisan(db_session)
    product = await _product(db_session, artisan)
    await db_session.commit()

    res = await client.post(
        f"{BASE}/reserve",
        json={
            "product_id": product.id,
            "qty": 1,
            "buyer_name": "B",
            "buyer_phone": "9876543231",
            "otp": "123456",
        },
    )
    rid = res.json()["id"]

    forbidden = await client.patch(
        f"{BASE}/reservations/{rid}/confirm", params={"artisan_id": other.id}
    )
    assert forbidden.status_code == 403

    ok = await client.patch(
        f"{BASE}/reservations/{rid}/confirm", params={"artisan_id": artisan.id}
    )
    assert ok.status_code == 200
    assert ok.json()["status"] == "confirmed"

    product2 = await _product(db_session, artisan, title="DeclineMe")
    pid2 = product2.id
    await db_session.commit()
    res2 = await client.post(
        f"{BASE}/reserve",
        json={
            "product_id": product2.id,
            "qty": 1,
            "buyer_name": "B",
            "buyer_phone": "9876543232",
            "otp": "123456",
        },
    )
    rid2 = res2.json()["id"]
    dec = await client.patch(
        f"{BASE}/reservations/{rid2}/decline", params={"artisan_id": artisan.id}
    )
    assert dec.status_code == 200
    assert dec.json()["status"] == "declined"
    refreshed = (
        await db_session.execute(select(Product).where(Product.id == pid2))
    ).scalar_one()
    assert refreshed.reserved_qty == 0


async def test_my_reservations_by_phone(client, db_session):
    artisan = await _artisan(db_session)
    product = await _product(db_session, artisan)
    await db_session.commit()
    await client.post(
        f"{BASE}/reserve",
        json={
            "product_id": product.id,
            "qty": 1,
            "buyer_name": "B",
            "buyer_phone": "9876543241",
            "otp": "123456",
        },
    )
    res = await client.get(f"{BASE}/my-reservations", params={"phone": "9876543241"})
    assert res.status_code == 200
    assert res.json()["count"] == 1
    empty = await client.get(f"{BASE}/my-reservations", params={"phone": "9000000000"})
    assert empty.json()["count"] == 0


async def test_expiry_release(db_session):
    artisan = await _artisan(db_session)
    product = await _product(db_session, artisan, stock_qty=3, stock_type="quantity")
    await db_session.flush()
    from app.models.customer import Customer

    customer = Customer(name="B", phone_hash=Customer.hash_phone("9876543251"))
    db_session.add(customer)
    await db_session.flush()
    expired_res = Reservation(
        product_id=product.id,
        customer_id=customer.id,
        qty=2,
        status="pending",
        expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
        pickup_code="EXP001",
    )
    db_session.add(expired_res)
    product.reserved_qty = 2
    await db_session.flush()
    rid = expired_res.id
    pid = product.id
    await db_session.commit()

    released = await release_expired(db_session)
    assert released == 1
    row = (
        await db_session.execute(select(Reservation).where(Reservation.id == rid))
    ).scalar_one()
    assert row.status == "expired"
    prod = (
        await db_session.execute(select(Product).where(Product.id == pid))
    ).scalar_one()
    assert prod.reserved_qty == 0


async def test_invalid_otp_rejected(client, db_session):
    artisan = await _artisan(db_session)
    product = await _product(db_session, artisan)
    await db_session.commit()
    res = await client.post(
        f"{BASE}/reserve",
        json={
            "product_id": product.id,
            "qty": 1,
            "buyer_name": "B",
            "buyer_phone": "9876543261",
            "otp": "12",
        },
    )
    assert res.status_code in (400, 422)


def test_otp_mock_accepts_any_six_digit():
    from app.services.otp_service import otp_service

    assert otp_service.verify("123456") is True
    assert otp_service.verify("654321") is True
    assert otp_service.verify("12") is False
    assert otp_service.generate("9876543210") == "123456"
    assert otp_service.verify("9876543210", "999999") is True
