from typing import Optional

from pydantic import BaseModel, Field


class DispatchRequest(BaseModel):
    order_id: str
    artisan_id: str
    product_id: Optional[str] = None
    origin_pin: str = Field(..., min_length=6, max_length=6)
    destination_pin: str = Field(..., min_length=6, max_length=6)


class DispatchResponse(BaseModel):
    tracking_id: str
    barcode_code128: str
    status: str
    pickup_scheduled: bool = True


class TrackingMilestone(BaseModel):
    status: str
    timestamp: str


class TrackResponse(BaseModel):
    tracking_id: str
    status: str
    milestones: list[TrackingMilestone]
