"""Reserve-only marketplace holds (SIH PS 26090, Map #86 T2).

Buyer reserves verified product → 7-day hold → artisan confirms
(offline pay). Atomic row lock mirrors
``ExportAdapterService.lock_inventory_on_sale`` (``with_for_update``).
"""

from __future__ import annotations

import re
import secrets
import string
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.artisan import Artisan
from app.models.customer import Customer
from app.models.product import Product
from app.models.reservation import (
    HOLD_DAYS,
    Reservation,
    default_expiry,
)
from app.services.notify_service import notify_service
from app.services.otp_service import otp_service

VERIFIED_STATUSES = ("passport_issued", "published")
ACTIVE_STATUSES = ("pending", "confirmed")
MAX_ACTIVE_PER_PHONE = 5

_PICKUP_ALPHABET = string.ascii_uppercase + string.digits


class ReserveError(ValueError):
    """Domain error; router maps to 400/404/403."""


def _normalize_phone(raw: str) -> str:
    digits = re.sub(r"\D", "", raw or "")
    return digits[-10:] if len(digits) >= 10 else digits


def _new_pickup_code() -> str:
    return "".join(secrets.choice(_PICKUP_ALPHABET) for _ in range(6))


async def _unique_pickup_code(db: AsyncSession) -> str:
    for _ in range(20):
        code = _new_pickup_code()
        exists = (
            await db.execute(
                select(Reservation.id).where(Reservation.pickup_code == code)
            )
        ).scalar_one_or_none()
        if not exists:
            return code
    raise ReserveError("Could not allocate pickup code; retry.")


def _notify_best_effort(**kwargs) -> None:
    try:
        notify_service.dispatch_alert(**kwargs)
    except Exception:
        pass


async def list_verified_products(
    db: AsyncSession,
    cluster: str | None = None,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Product]:
    stmt = select(Product).where(
        Product.is_listed.is_(True),
        Product.status.in_(VERIFIED_STATUSES),
    )
    if search:
        like = f"%{search.strip()}%"
        stmt = stmt.where(Product.title.ilike(like))
    if cluster:
        stmt = stmt.join(Artisan, Artisan.id == Product.artisan_id).where(
            Artisan.cluster_name.ilike(f"%{cluster.strip()}%")
        )
    stmt = stmt.order_by(Product.created_at.desc()).offset(offset).limit(limit)
    return list((await db.execute(stmt)).scalars().all())


async def _get_or_create_customer(
    db: AsyncSession, buyer_name: str, buyer_phone: str
) -> Customer:
    from app.core.pii_vault import protect

    phone_hash = Customer.hash_phone(buyer_phone)
    customer = (
        await db.execute(select(Customer).where(Customer.phone_hash == phone_hash))
    ).scalar_one_or_none()
    if customer:
        if buyer_name and not customer.name:
            customer.name = buyer_name[:120]
            await db.flush()
        return customer
    customer = Customer(
        name=(buyer_name or "")[:120],
        phone_hash=phone_hash,
        phone_token=protect(_normalize_phone(buyer_phone)),
    )
    db.add(customer)
    await db.flush()
    return customer


async def reserve_product(
    db: AsyncSession,
    product_id: str,
    qty: int = 1,
    buyer_name: str = "",
    buyer_phone: str = "",
    otp: str = "",
    buyer_artisan_id: str | None = None,
) -> Reservation:
    """Create a 7-day hold with atomic stock lock."""
    if not otp_service.verify(buyer_phone, otp):
        raise ReserveError("Invalid OTP; 6-digit code required.")
    msisdn = _normalize_phone(buyer_phone)
    if len(msisdn) != 10:
        raise ReserveError("buyer_phone must be a 10-digit Indian mobile number.")
    if not isinstance(qty, int) or qty < 1:
        raise ReserveError("qty must be a positive integer.")

    stmt = select(Product).where(Product.id == product_id).with_for_update()
    product = (await db.execute(stmt)).scalar_one_or_none()
    if not product:
        raise ReserveError("Product not found.")
    if not product.is_listed or product.status not in VERIFIED_STATUSES:
        raise ReserveError("Product is not a verified listed item.")
    if product.status == "sold_out":
        raise ReserveError("Product is sold out.")
    if buyer_artisan_id and buyer_artisan_id == product.artisan_id:
        raise ReserveError("Artisans cannot reserve their own product.")
    if product.stock_type == "unique" and qty != 1:
        raise ReserveError("Unique 1-of-1 items can only be reserved with qty=1.")
    if (product.reserved_qty or 0) + qty > (product.stock_qty or 0):
        raise ReserveError("Not enough stock; oversell blocked.")

    artisan = (
        await db.execute(select(Artisan).where(Artisan.id == product.artisan_id))
    ).scalar_one_or_none()
    if artisan and artisan.phone:
        artisan_msisdn = _normalize_phone(str(artisan.phone))
        if artisan_msisdn and artisan_msisdn == msisdn:
            raise ReserveError("Artisans cannot reserve their own product.")

    customer = await _get_or_create_customer(db, buyer_name, buyer_phone)
    active_count = (
        await db.execute(
            select(func.count())
            .select_from(Reservation)
            .where(
                Reservation.customer_id == customer.id,
                Reservation.status.in_(ACTIVE_STATUSES),
            )
        )
    ).scalar_one()
    if (active_count or 0) >= MAX_ACTIVE_PER_PHONE:
        raise ReserveError("Reserve limit reached: max 5 active holds per phone.")

    reservation = Reservation(
        product_id=product.id,
        customer_id=customer.id,
        qty=qty,
        status="pending",
        expires_at=default_expiry(),
        pickup_code=await _unique_pickup_code(db),
    )
    db.add(reservation)
    product.reserved_qty = (product.reserved_qty or 0) + qty
    await db.commit()
    await db.refresh(reservation)

    _notify_best_effort(
        artisan_id=product.artisan_id,
        phone_number=getattr(artisan, "phone", "") or "",
        event_type="NEW_ORDER",
        channel="IVR_VOICE",
        order_id=reservation.pickup_code,
        custom_message=(
            f"New reserve hold {reservation.pickup_code} for "
            f"{product.title} x{qty}. Confirm in Dashboard."
        ),
    )
    return reservation


async def set_reservation_status(
    db: AsyncSession,
    reservation_id: str,
    action: str,
    requester_artisan_id: str,
) -> Reservation:
    """Artisan/SHG owner confirms or declines a pending hold."""
    if action not in ("confirm", "decline"):
        raise ReserveError("action must be confirm or decline.")
    if not requester_artisan_id:
        raise ReserveError("artisan_id is required (owner only).")
    reservation = (
        await db.execute(
            select(Reservation).where(Reservation.id == reservation_id).with_for_update()
        )
    ).scalar_one_or_none()
    if not reservation:
        raise ReserveError("Reservation not found.")
    stmt = select(Product).where(Product.id == reservation.product_id).with_for_update()
    product = (await db.execute(stmt)).scalar_one_or_none()
    if not product:
        raise ReserveError("Product not found.")
    if product.artisan_id != requester_artisan_id:
        raise PermissionError("Only the owning artisan/SHG can confirm/decline.")
    if reservation.status != "pending":
        past = "confirmed" if action == "confirm" else "declined"
        raise ReserveError(f"Only pending holds can be {past}.")
    if action == "confirm":
        reservation.status = "confirmed"
    else:
        reservation.status = "declined"
        product.reserved_qty = max(0, (product.reserved_qty or 0) - reservation.qty)
    await db.commit()
    await db.refresh(reservation)

    artisan = (
        await db.execute(select(Artisan).where(Artisan.id == product.artisan_id))
    ).scalar_one_or_none()
    _notify_best_effort(
        artisan_id=product.artisan_id,
        phone_number=getattr(artisan, "phone", "") or "",
        event_type="NEW_ORDER",
        channel="IVR_VOICE",
        order_id=reservation.pickup_code,
        custom_message=f"Hold {reservation.pickup_code} {reservation.status}.",
    )
    customer = (
        await db.execute(select(Customer).where(Customer.id == reservation.customer_id))
    ).scalar_one_or_none()
    if customer is not None and getattr(customer, "phone_token", None):
        try:
            from app.core.pii_vault import reveal

            customer_phone = str(reveal(customer.phone_token) or "")
        except Exception:
            customer_phone = ""
        if customer_phone:
            _notify_best_effort(
                artisan_id=product.artisan_id,
                phone_number=customer_phone,
                event_type="NEW_ORDER",
                channel="IVR_VOICE",
                order_id=reservation.pickup_code,
                custom_message=f"Hold {reservation.pickup_code} {reservation.status}.",
            )
    return reservation


async def list_reservations_by_phone(db: AsyncSession, phone: str) -> list[Reservation]:
    phone_hash = Customer.hash_phone(phone)
    customer = (
        await db.execute(select(Customer).where(Customer.phone_hash == phone_hash))
    ).scalar_one_or_none()
    if not customer:
        return []
    rows = (
        (
            await db.execute(
                select(Reservation)
                .where(Reservation.customer_id == customer.id)
                .order_by(Reservation.created_at.desc())
            )
        )
        .scalars()
        .all()
    )
    return list(rows)


async def release_expired(
    db: AsyncSession,
    now: datetime | None = None,
    limit: int = 500,
) -> int:
    """Expiry cron: release pending holds past ``expires_at``."""
    now = now or datetime.now(timezone.utc)
    rows = (
        (
            await db.execute(
                select(Reservation)
                .where(
                    Reservation.status == "pending",
                    Reservation.expires_at <= now,
                )
                .limit(limit)
                .with_for_update()
            )
        )
        .scalars()
        .all()
    )
    released = 0
    for res in rows:
        product = (
            await db.execute(
                select(Product).where(Product.id == res.product_id).with_for_update()
            )
        ).scalar_one_or_none()
        res.status = "expired"
        if product:
            product.reserved_qty = max(0, (product.reserved_qty or 0) - res.qty)
        released += 1
    if released:
        await db.commit()
    return released


__all__ = [
    "HOLD_DAYS",
    "MAX_ACTIVE_PER_PHONE",
    "ReserveError",
    "release_expired",
    "reserve_product",
    "list_reservations_by_phone",
    "list_verified_products",
    "set_reservation_status",
]
