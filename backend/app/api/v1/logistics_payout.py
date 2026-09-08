from fastapi import APIRouter, HTTPException, status
from app.schemas.logistics_payout import (
    IndiaPostDispatchRequest,
    IndiaPostDispatchResponse,
    DirectPayoutRequest,
    DirectPayoutResponse,
)
from app.services.logistics_service import logistics_service
from app.services.payout_service import payout_service

router = APIRouter(prefix="", tags=["First-Mile Logistics & Direct Jan Dhan Payouts"])


@router.post("/logistics/india-post/dispatch", response_model=IndiaPostDispatchResponse)
async def dispatch_india_post(payload: IndiaPostDispatchRequest):
    """
    First-Mile Logistics Adapter:
    Creates India Post / CSC parcel dispatch record and generates barcode label data.
    """
    res = logistics_service.create_india_post_dispatch(
        order_id=payload.order_id,
        artisan_id=payload.artisan_id,
        pickup_pincode=payload.pickup_pincode,
        delivery_pincode=payload.delivery_pincode,
        weight_grams=payload.weight_grams
    )
    return IndiaPostDispatchResponse(**res)


@router.get("/logistics/india-post/track/{tracking_id}")
async def track_india_post_shipment(tracking_id: str):
    """
    Tracks India Post / CSC parcel transit status.
    """
    return logistics_service.track_parcel(tracking_id)


@router.post("/payouts/direct-transfer", response_model=DirectPayoutResponse)
async def direct_jandhan_payout(payload: DirectPayoutRequest):
    """
    Direct Jan Dhan / UPI Payout Service:
    Disburses funds directly from middleman-free escrow to artisan's bank account.
    """
    res = payout_service.execute_direct_payout(
        order_id=payload.order_id,
        artisan_id=payload.artisan_id,
        amount_inr=payload.amount_inr,
        payout_channel=payload.payout_channel,
        upi_id_or_account=payload.upi_id_or_account,
        ifsc_code=payload.ifsc_code or "SBIN0001234"
    )
    return DirectPayoutResponse(**res)
