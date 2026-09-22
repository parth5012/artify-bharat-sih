from fastapi import APIRouter
from app.schemas.notification import SendNotificationRequest, SendNotificationResponse
from app.services.notify_service import notify_service

router = APIRouter(prefix="/notify", tags=["SMS & IVR Notification Engine (Bhashini Voice Alerts)"])


@router.post("/send", response_model=SendNotificationResponse)
async def send_artisan_notification(payload: SendNotificationRequest):
    """
    SMS & IVR Engine:
    Sends automated voice call/SMS in regional dialect to inform rural artisans about orders or payouts.
    """
    res = notify_service.dispatch_alert(
        artisan_id=payload.artisan_id,
        phone_number=payload.phone_number,
        event_type=payload.event_type,
        channel=payload.channel,
        dialect=payload.dialect,
        order_id=payload.order_id,
        amount_inr=payload.amount_inr,
        custom_message=payload.custom_message
    )
    return SendNotificationResponse(**res)
