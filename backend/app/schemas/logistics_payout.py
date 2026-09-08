from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class IndiaPostDispatchRequest(BaseModel):
    order_id: str
    artisan_id: str
    pickup_pincode: str
    delivery_pincode: str
    weight_grams: int = 500
    recipient_name: str = "Buyer"
    recipient_address: str = "Central Delivery Hub"

class IndiaPostDispatchResponse(BaseModel):
    tracking_id: str
    order_id: str
    barcode_data: str
    pickup_hub: str
    estimated_delivery_days: int
    service_type: str = "Speed Post / CSC Rural Logistics"
    dispatch_slip_url: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DirectPayoutRequest(BaseModel):
    order_id: str
    artisan_id: str
    amount_inr: float = Field(..., gt=0)
    payout_channel: str = Field("JAN_DHAN_DIRECT", description="'JAN_DHAN_DIRECT' or 'UPI_DIRECT'")
    upi_id_or_account: str
    ifsc_code: Optional[str] = "SBIN0001234"

class DirectPayoutResponse(BaseModel):
    transaction_id: str
    order_id: str
    artisan_id: str
    amount_inr: float
    payout_channel: str
    status: str = "SETTLED_INSTANT"
    middleman_commission_inr: float = 0.0
    settled_at: datetime = Field(default_factory=datetime.utcnow)
    utr_number: str
