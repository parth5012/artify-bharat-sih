from fastapi import APIRouter, Depends, HTTPException, status
from starlette.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_artisan, AuthenticatedPrincipal
from app.models.artisan import Artisan
from app.schemas.whatsapp import WhatsAppAlertRequest, WhatsAppAlertResponse
from app.services.whatsapp_service import whatsapp_service

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp Business Cloud API (Meta Graph API v20.0)"])


def normalize_phone(phone: str) -> str:
    """Extracts base 10-digit number for phone authorization matching."""
    digits = "".join(c for c in phone if c.isdigit())
    if len(digits) > 10 and digits.startswith("91"):
        return digits[-10:]
    return digits[-10:] if len(digits) >= 10 else digits


@router.post("/send-alert", response_model=WhatsAppAlertResponse, status_code=status.HTTP_200_OK)
async def send_whatsapp_alert(
    payload: WhatsAppAlertRequest,
    current_user: AuthenticatedPrincipal = Depends(get_current_artisan),
    db: AsyncSession = Depends(get_db),
):
    """
    WhatsApp Notification Integration (Meta Graph API v20.0):
    Dispatches automated order status updates, CSC drop-off alerts,
    and Jan Dhan payout notifications directly to rural artisans and SHG leaders.
    Requires authentication and verifies that recipient_phone belongs to the authenticated caller.
    """
    # Authorize recipient phone for non-admin principals
    if current_user.role != "admin":
        stmt = select(Artisan).where(Artisan.id == current_user.id)
        res = await db.execute(stmt)
        artisan = res.scalar_one_or_none()

        target_phone = normalize_phone(payload.recipient_phone)
        artisan_phone = normalize_phone(artisan.phone) if artisan and artisan.phone else ""

        if not artisan or target_phone != artisan_phone:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Recipient phone number is not authorized for the authenticated user.",
            )

    # Invoke synchronous Meta Graph API network request non-blockingly in threadpool
    result = await run_in_threadpool(
        whatsapp_service.send_text_alert,
        recipient_phone=payload.recipient_phone,
        message_body=payload.message_body,
        alert_type=payload.alert_type or "ORDER_STATUS_UPDATE",
        order_id=payload.order_id,
        tracking_pin=payload.tracking_pin,
        preview_url=payload.preview_url,
    )

    if not result.get("success") and result.get("meta_response_code") == 503:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to communicate with WhatsApp Meta Graph API: {result.get('details')}",
        )

    return WhatsAppAlertResponse(**result)
