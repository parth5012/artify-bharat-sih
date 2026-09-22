"""
/api/v1/logistics — India Post / CSC dispatch + tracking (Task 5.5).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services import logistics_service as logistics
from app.schemas.logistics import (
    DispatchRequest,
    DispatchResponse,
    TrackResponse,
    TrackingMilestone,
)

router = APIRouter(prefix="/logistics", tags=["logistics"])


@router.post("/india-post/dispatch", response_model=DispatchResponse, status_code=201)
async def dispatch(req: DispatchRequest, db: AsyncSession = Depends(get_db)):
    parcel = await logistics.dispatch_parcel(
        db,
        order_id=req.order_id,
        artisan_id=req.artisan_id,
        product_id=req.product_id,
        origin_pin=req.origin_pin,
        destination_pin=req.destination_pin,
    )
    return DispatchResponse(
        tracking_id=parcel.tracking_id,
        barcode_code128=parcel.barcode_code128,
        status=parcel.status,
    )


@router.get("/india-post/track/{tracking_id}", response_model=TrackResponse)
async def track(tracking_id: str, db: AsyncSession = Depends(get_db)):
    try:
        parcel = await logistics.get_tracking(db, tracking_id)
    except logistics.LogisticsError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    milestones = logistics.build_milestone_timeline(parcel.status, parcel.created_at)
    return TrackResponse(
        tracking_id=parcel.tracking_id,
        status=parcel.status,
        milestones=[TrackingMilestone(**m) for m in milestones],
    )
