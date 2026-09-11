"""
logistics_service.py — India Post / CSC Speed Post dispatch, Code-128 barcode
generation, and parcel tracking (Task 5.5).
"""
from __future__ import annotations

import random
import string
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.logistics import LogisticsDispatch

MILESTONE_SEQUENCE = ["LABEL_CREATED", "CSC_VLE_ACCEPTED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"]


class LogisticsError(Exception):
    def __init__(self, detail: str, status_code: int = 400):
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)


def _generate_tracking_id() -> str:
    # India Post Speed Post format: 2 letters + 9 digits + 2 letters, e.g. IP882910492IN
    digits = "".join(random.choices(string.digits, k=9))
    return f"IP{digits}IN"


def _generate_code128_barcode(tracking_id: str, origin_pin: str, destination_pin: str) -> str:
    # Deterministic Code-128 payload string; a real render would feed this
    # into a barcode library (e.g. python-barcode) at label print time.
    return f"*{tracking_id}*{origin_pin}>{destination_pin}*"


async def dispatch_parcel(
    db: AsyncSession,
    order_id: str,
    artisan_id: str,
    product_id: str | None,
    origin_pin: str,
    destination_pin: str,
) -> LogisticsDispatch:
    tracking_id = _generate_tracking_id()
    barcode = _generate_code128_barcode(tracking_id, origin_pin, destination_pin)

    dispatch = LogisticsDispatch(
        order_id=order_id,
        artisan_id=artisan_id,
        product_id=product_id,
        tracking_id=tracking_id,
        barcode_code128=barcode,
        origin_pin=origin_pin,
        destination_pin=destination_pin,
        status="LABEL_CREATED",
    )
    db.add(dispatch)
    await db.commit()
    await db.refresh(dispatch)
    return dispatch


async def get_tracking(db: AsyncSession, tracking_id: str) -> LogisticsDispatch:
    result = await db.execute(
        select(LogisticsDispatch).where(LogisticsDispatch.tracking_id == tracking_id)
    )
    dispatch = result.scalar_one_or_none()
    if dispatch is None:
        raise LogisticsError("Tracking ID not found", 404)
    return dispatch


def build_milestone_timeline(current_status: str, created_at: datetime) -> list[dict]:
    """Synthesizes a milestone timeline up to (and including) current_status.
    In production this would be sourced from real India Post scan events."""
    idx = MILESTONE_SEQUENCE.index(current_status) if current_status in MILESTONE_SEQUENCE else 0
    timeline = []
    for i, milestone in enumerate(MILESTONE_SEQUENCE[: idx + 1]):
        timeline.append(
            {
                "status": milestone,
                "timestamp": created_at.isoformat(),
            }
        )
    return timeline


async def advance_status(db: AsyncSession, tracking_id: str, new_status: str) -> LogisticsDispatch:
    if new_status not in MILESTONE_SEQUENCE:
        raise LogisticsError(f"Invalid status; must be one of {MILESTONE_SEQUENCE}", 400)
    dispatch = await get_tracking(db, tracking_id)
    dispatch.status = new_status
    await db.commit()
    await db.refresh(dispatch)
    return dispatch
