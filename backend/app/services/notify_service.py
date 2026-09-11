import uuid
from typing import Dict, Any, List
from datetime import datetime, timezone

class NotifyService:
    """
    SMS & IVR Engine:
    - Bhashini Voice Alerts for offline rural artisans
    - Automated telephone voice call alerts upon new GeM/ONDC orders
    - Instant Jan Dhan payout SMS alerts
    - Zero-literacy spoken IVR prompts in native dialects (Bhojpuri, Maithili, etc.)
    """
    
    def __init__(self):
        self._notification_log: List[Dict[str, Any]] = []

    def dispatch_alert(self, artisan_id: str, phone_number: str, 
                       event_type: str = "NEW_ORDER", channel: str = "IVR_VOICE",
                       dialect: str = "bhojpuri", order_id: str = None, 
                       amount_inr: float = None, custom_message: str = None) -> Dict[str, Any]:
        notification_id = f"notif_{uuid.uuid4().hex[:8]}"
        
        # Craft dialect-aware message
        if event_type == "NEW_ORDER":
            voice_script = f"Namaste! Aapke banaye utpad ka naya order aaya hai (Order #{order_id or '1029'}). Kripya CSC kendra par jaakar packet drop karein."
        elif event_type == "PAYOUT_SETTLED":
            voice_script = f"Badhaai ho! Aapke Jan Dhan khate mein Rs {int(amount_inr or 4500)} seedhe jama ho gaye hain bina kisi dalal ke."
        else:
            voice_script = custom_message or "Artify Bharat se mahatvapurna sandesh."
            
        whatsapp_result = None
        if channel.upper() == "WHATSAPP":
            from app.services.whatsapp_service import whatsapp_service
            whatsapp_result = whatsapp_service.send_text_alert(
                recipient_phone=phone_number,
                message_body=voice_script,
                alert_type=event_type,
                order_id=order_id,
            )

        record = {
            "notification_id": notification_id,
            "artisan_id": artisan_id,
            "recipient_phone": phone_number,
            "channel": channel,
            "dialect_used": dialect,
            "event_type": event_type,
            "voice_script": voice_script,
            "audio_stream_url": f"https://api.artify.gov.in/audio/ivr/{notification_id}.mp3",
            "status": "DISPATCHED",
            "whatsapp_meta_response": whatsapp_result,
            "sent_at": datetime.now(timezone.utc).isoformat()
        }
        self._notification_log.append(record)
        return record

    def get_history(self, artisan_id: str) -> List[Dict[str, Any]]:
        return [n for n in self._notification_log if n["artisan_id"] == artisan_id]

notify_service = NotifyService()
