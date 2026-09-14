"""Buyer marketplace + reserve-only holds (SIH PS 26090, Map #86 T2)."""

from __future__ import annotations

import os
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.reserve_service import (
    ReserveError,
    list_reservations_by_phone,
    list_verified_products,
    release_expired,
    reserve_product,
    set_reservation_status,
)

router = APIRouter(prefix="/marketplace", tags=["Buyer Marketplace & Reserves"])


class ReserveRequest(BaseModel):
    product_id: str = Field(min_length=1)
    qty: int = Field(default=1, ge=1)
    buyer_name: str = Field(default="", max_length=120)
    buyer_phone: str = Field(min_length=10, max_length=20)
    otp: str = Field(min_length=6, max_length=6)
    artisan_id: str | None = Field(default=None)


class ReservationResponse(BaseModel):
    id: str
    product_id: str
    qty: int
    status: str
    expires_at: datetime
    pickup_code: str | None


def _to_response(res) -> dict:
    return {
        "id": res.id,
        "product_id": res.product_id,
        "qty": res.qty,
        "status": res.status,
        "expires_at": res.expires_at,
        "pickup_code": res.pickup_code,
    }


def _err_to_http(exc: Exception) -> HTTPException:
    if isinstance(exc, PermissionError):
        return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    msg = str(exc)
    if msg in ("Product not found.", "Reservation not found."):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=msg)
    if "Only the owning artisan" in msg:
        return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=msg)
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)


@router.get("/products")
async def browse_products(
    cluster: str | None = Query(default=None),
    search: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """Guest browse: verified-only (is_listed + passport_issued/published)."""
    products = await list_verified_products(db, cluster, search, limit, offset)
    return {
        "count": len(products),
        "items": [
            {
                "product_id": p.id,
                "artisan_id": p.artisan_id,
                "title": p.title,
                "craft_category": p.craft_category,
                "status": p.status,
                "stock_qty": p.stock_qty,
                "stock_type": p.stock_type,
                "reserved_qty": p.reserved_qty,
                "available_qty": max(0, (p.stock_qty or 0) - (p.reserved_qty or 0)),
            }
            for p in products
        ],
    }


@router.post("/reserve", response_model=ReservationResponse, status_code=201)
async def create_reserve(payload: ReserveRequest, db: AsyncSession = Depends(get_db)):
    try:
        res = await reserve_product(
            db,
            product_id=payload.product_id,
            qty=payload.qty,
            buyer_name=payload.buyer_name,
            buyer_phone=payload.buyer_phone,
            otp=payload.otp,
            buyer_artisan_id=payload.artisan_id,
        )
    except ReserveError as exc:
        raise _err_to_http(exc) from exc
    return _to_response(res)


@router.patch(
    "/reservations/{reservation_id}/{action}", response_model=ReservationResponse
)
async def confirm_or_decline(
    reservation_id: str,
    action: str,
    artisan_id: str = Query(description="Owning artisan/SHG id"),
    db: AsyncSession = Depends(get_db),
):
    try:
        res = await set_reservation_status(db, reservation_id, action, artisan_id)
    except PermissionError as exc:
        raise _err_to_http(exc) from exc
    except ReserveError as exc:
        raise _err_to_http(exc) from exc
    return _to_response(res)


@router.get("/my-reservations")
async def my_reservations(
    phone: str = Query(min_length=10, max_length=20),
    db: AsyncSession = Depends(get_db),
):
    rows = await list_reservations_by_phone(db, phone)
    return {"count": len(rows), "items": [_to_response(r) for r in rows]}


@router.post("/expiry/run")
async def run_expiry(
    db: AsyncSession = Depends(get_db),
    x_internal_cron: str | None = Header(default=None),
):
    """Manual/cron trigger for 7-day hold expiry (also see Celery beat)."""
    # TODO: replace shared-secret header with admin JWT / CronJob service account.
    env = os.getenv("ENVIRONMENT", "development").lower()
    if env in ("production", "prod", "staging") and not x_internal_cron:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing x-internal-cron.")
    released = await release_expired(db)
    return {"released": released}
