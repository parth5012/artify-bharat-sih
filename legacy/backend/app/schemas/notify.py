from typing import Literal

from pydantic import BaseModel


class NotifyRequest(BaseModel):
    artisan_id: str
    event_type: Literal["ORDER_DISPATCH", "PAYMENT_CREDITED"]
    dialect: str
    context: dict = {}  # e.g. {"order_id": "...", "amount": 9800}


class NotifyResponse(BaseModel):
    call_id: str
    status: str  # QUEUED | DISPATCHED | FAILED
    dialect: str
