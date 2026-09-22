from typing import Optional

from pydantic import BaseModel, Field


class DirectTransferRequest(BaseModel):
    artisan_id: str
    order_id: str
    product_id: Optional[str] = None
    amount: float = Field(..., gt=0, description="Full retail price, e.g. 9800.00")
    channel: str = Field("PFMS_DBT", pattern="^(PFMS_DBT|UPI)$")


class DirectTransferResponse(BaseModel):
    payout_id: str
    utr_number: str
    amount: float
    platform_fee_pct: float
    net_amount: float
    status: str


class PayoutHistoryItem(BaseModel):
    payout_id: str
    order_id: Optional[str]
    amount: float
    utr_number: str
    status: str
    created_at: str


class PayoutHistoryResponse(BaseModel):
    artisan_id: str
    total_disbursed: float
    transactions: list[PayoutHistoryItem]
