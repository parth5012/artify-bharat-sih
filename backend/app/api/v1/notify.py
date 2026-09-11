"""
/api/v1/notify — Bhashini TTS IVR voice-call dispatcher (Task 5.7).
"""
from fastapi import APIRouter

from app.services import notify_service
from app.schemas.notify import NotifyRequest, NotifyResponse

router = APIRouter(prefix="/notify", tags=["notify"])


@router.post("/send", response_model=NotifyResponse, status_code=202)
async def send(req: NotifyRequest):
    result = await notify_service.send_ivr_notification(
        req.artisan_id, req.event_type, req.dialect, req.context
    )
    return NotifyResponse(**result)
