from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class WhatsAppAlertRequest(BaseModel):
    recipient_phone: str = Field(
        ...,
        description="Recipient mobile number with country code (e.g., +919876543210 or 9876543210)",
        examples=["+919876543210"],
    )
    message_body: str = Field(
        ...,
        description="Text content of the notification or update message",
        examples=["Namaste Radha Devi! Your Madhubani artwork has been verified with 6-char passport A7X-9B2. Please drop off at your nearest CSC."],
    )
    alert_type: Optional[str] = Field(
        default="ORDER_STATUS_UPDATE",
        description="Type of alert: ORDER_STATUS_UPDATE, FIRST_MILE_DROPOFF, PAYOUT_SETTLEMENT, or PASSPORT_ISSUED",
    )
    order_id: Optional[str] = Field(None, description="Associated Order ID if applicable")
    tracking_pin: Optional[str] = Field(None, description="6-digit India Post / CSC drop-off tracking PIN")
    preview_url: bool = Field(default=False, description="Whether to generate link previews for URLs in the message")


class WhatsAppAlertResponse(BaseModel):
    success: bool
    status: str = Field(..., description="Message status: queued, sent, delivered, or simulated_sandbox")
    recipient_phone: str
    message_id: Optional[str] = None
    meta_response_code: int = 200
    details: Optional[Dict[str, Any]] = None
