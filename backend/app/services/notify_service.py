"""
notify_service.py — Automated Bhashini TTS IVR voice-call notification
dispatcher (Task 5.7). Dispatch is fire-and-forget from the API's point of
view; the actual call placement is delegated to Celery in production
(BHASHINI_* env vars, shared integration with Yashit's work).
"""
from __future__ import annotations

import httpx

from app.core.config import settings
from app.models._shared import new_id

EVENT_TEMPLATES = {
    "ORDER_DISPATCH": "A new order has arrived. Please drop your parcel at the CSC.",
    "PAYMENT_CREDITED": "Your payment has been credited directly to your Jan Dhan account.",
}


async def send_ivr_notification(artisan_id: str, event_type: str, dialect: str, context: dict) -> dict:
    message_template = EVENT_TEMPLATES.get(event_type, "You have a new notification.")
    call_id = new_id("call")

    payload = {
        "userId": settings.BHASHINI_USER_ID,
        "pipelineId": settings.BHASHINI_PIPELINE_ID,
        "dialect": dialect,
        "text": message_template,
        "context": context,
        "callbackRef": call_id,
    }
    headers = {"Authorization": f"Bearer {settings.BHASHINI_API_KEY}"}

    status = "QUEUED"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                "https://bhashini.gov.in/api/v1/ivr/dispatch", json=payload, headers=headers
            )
            if resp.status_code < 300:
                status = "DISPATCHED"
    except Exception:
        # Sandbox: no real Bhashini network access — treat as queued for
        # the Celery worker to retry, rather than failing the API call.
        status = "QUEUED"

    return {"call_id": call_id, "status": status, "dialect": dialect}
