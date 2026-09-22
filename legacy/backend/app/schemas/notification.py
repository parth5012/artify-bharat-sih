from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class SendNotificationRequest(BaseModel):
    artisan_id: str
    phone_number: str
    channel: str = Field("IVR_VOICE", description="'IVR_VOICE', 'SMS', or 'WHATSAPP'")
    dialect: str = Field("bhojpuri", description="Dialect for IVR voice synthesis")
    event_type: str = Field("NEW_ORDER", description="Event type: NEW_ORDER, PAYOUT_SETTLED, JURY_INVITE")
    order_id: Optional[str] = None
    amount_inr: Optional[float] = None
    custom_message: Optional[str] = None

class SendNotificationResponse(BaseModel):
    notification_id: str
    status: str = "DISPATCHED"
    channel: str
    recipient_phone: str
    dialect_used: str
    audio_stream_url: Optional[str] = None
    whatsapp_meta_response: Optional[dict] = None
    sent_at: datetime = Field(default_factory=datetime.utcnow)
