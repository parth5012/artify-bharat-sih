"""Marketplace T1: Customer / Reservation / Product stock fields (issue #87)."""

import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.models.artisan import Artisan
from app.models.customer import Customer
from app.models.product import Product
from app.models.reservation import (
    HOLD_DAYS,
    RESERVATION_STATUSES,
    Reservation,
    default_expiry,
)


async def _make_product(db_session, **kw):
    phone = "9%09d" % (int(uuid.uuid4().hex[:9], 16) % 1_000_000_000)
    artisan = Artisan(name="A", phone=phone, pin_hash="x")
    db_session.add(artisan)
    await db_session.flush()
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


async def test_customer_phone_hash_unique(db_session):
    db_session.add(
        Customer(
            name="Buyer",
            phone_hash=Customer.hash_phone("9876543210"),
            phone_token="tok",
        )
    )
    await db_session.commit()
    db_session.add(
        Customer(name="Dup", phone_hash=Customer.hash_phone("9876543210"))
    )
    with pytest.raises(IntegrityError):
        await db_session.commit()


def test_customer_hash_phone_normalizes_and_peppers():
    assert Customer.hash_phone("+91-98765 43210") == Customer.hash_phone(
        "9876543210"
    )
    hashed = Customer.hash_phone("9876543210")
    assert len(hashed) == 64 and all(c in "0123456789abcdef" for c in hashed)


async def test_product_stock_defaults(db_session):
    phone = "9%09d" % (int(uuid.uuid4().hex[:9], 16) % 1_000_000_000)
    artisan = Artisan(name="A", phone=phone, pin_hash="x")
    db_session.add(artisan)
    await db_session.flush()
    # Bare instantiation: only required fields, defaults come from model/DB.
    product = Product(artisan_id=artisan.id, title="Bare defaults")
    db_session.add(product)
    await db_session.flush()
    await db_session.refresh(product)
    assert product.stock_qty == 1
    assert product.stock_type == "unique"
    assert product.is_listed is False
    assert product.reserved_qty == 0


async def test_verified_only_queryable(db_session):
    listed = await _make_product(db_session, title="Listed")
    hidden = await _make_product(
        db_session, title="Hidden", status="draft", is_listed=False
    )
    rows = (
        (
            await db_session.execute(
                select(Product).where(
                    Product.is_listed.is_(True),
                    Product.status.in_(["passport_issued", "published"]),
                )
            )
        )
        .scalars()
        .all()
    )
    titles = {p.title for p in rows}
    assert "Listed" in titles
    assert "Hidden" not in titles
    assert listed.id and hidden.id


async def test_reservation_statuses_and_expiry(db_session):
    assert set(RESERVATION_STATUSES) == {
        "pending",
        "confirmed",
        "declined",
        "expired",
        "completed",
        "cancelled",
    }
    product = await _make_product(db_session)
    customer = Customer(name="Buyer", phone_hash=Customer.hash_phone("9876543211"))
    db_session.add(customer)
    await db_session.flush()
    res = Reservation(
        product_id=product.id,
        customer_id=customer.id,
        qty=1,
        status="pending",
        pickup_code="A7X9B2",
    )
    db_session.add(res)
    await db_session.commit()
    assert res.status == "pending"
    assert res.pickup_code is not None and len(res.pickup_code) == 6
    delta = res.expires_at - datetime.now(timezone.utc)
    assert 6 <= delta.days <= 7
    assert HOLD_DAYS == 7
    assert (default_expiry() - datetime.now(timezone.utc)).days >= 6
