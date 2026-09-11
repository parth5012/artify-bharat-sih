import hashlib
import uuid
from typing import Dict, Any
from datetime import datetime, timezone

class LogisticsService:
    """
    First-Mile Logistics Adapter:
    - Integrates India Post Speed Post & CSC Rural Logistics
    - PIN Code routing & estimated transit time
    - Generates 1D Code-128 barcode data and printable dispatch slips
    """
    
    def create_india_post_dispatch(self, order_id: str, artisan_id: str, 
                                  pickup_pincode: str, delivery_pincode: str, 
                                  weight_grams: int = 500) -> Dict[str, Any]:
        tracking_id = f"IP{uuid.uuid4().hex[:9].upper()}IN"
        barcode_data = f"INPOST:{tracking_id}:{pickup_pincode}->{delivery_pincode}"
        
        is_metro = delivery_pincode.startswith(("11", "40", "56", "70", "60"))
        transit_days = 2 if is_metro else 4
        
        return {
            "tracking_id": tracking_id,
            "order_id": order_id,
            "barcode_data": barcode_data,
            "pickup_hub": f"CSC Rural Logistics Centre (PIN: {pickup_pincode})",
            "estimated_delivery_days": transit_days,
            "service_type": "India Post Speed Post / CSC First-Mile",
            "dispatch_slip_url": f"https://api.artify.gov.in/logistics/slips/{tracking_id}.pdf",
            "created_at": datetime.now(timezone.utc).isoformat()
        }

    def track_parcel(self, tracking_id: str) -> Dict[str, Any]:
        return {
            "tracking_id": tracking_id,
            "current_status": "OUT_FOR_PICKUP",
            "location": "Varanasi Central Postal Sorting Facility",
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "milestones": [
                {"status": "LABEL_CREATED", "timestamp": "2026-09-08T10:00:00Z"},
                {"status": "CSC_VLE_ACCEPTED", "timestamp": "2026-09-08T14:30:00Z"},
                {"status": "IN_TRANSIT", "timestamp": "2026-09-08T18:00:00Z"}
            ]
        }

    def generate_csc_dropoff_pin(self, order_id: str, artisan_id: str, village_pincode: str) -> Dict[str, Any]:
        """
        First-Mile Drop-off Logistics (SIH PS 26090):
        Generates a formatted XXX-XXX drop-off PIN for the village Common Service Centre (CSC) or Post Office.
        The rural weaver takes the unboxed product to the village CSC, shares the XXX-XXX drop-off PIN,
        and the CSC VLE / Postmaster handles professional packaging and barcode labeling.
        """
        h1 = int(hashlib.sha256(order_id.encode("utf-8")).hexdigest()[:8], 16)
        h2 = int(hashlib.sha256(artisan_id.encode("utf-8")).hexdigest()[:8], 16)
        part1 = f"{h1 % 900 + 100}"
        part2 = f"{h2 % 900 + 100}"
        pin_code = f"{part1}-{part2}"
        
        return {
            "order_id": order_id,
            "artisan_id": artisan_id,
            "dropoff_pin": pin_code,
            "village_pincode": village_pincode,
            "csc_centre_name": f"CSC Gram Kendra (PIN: {village_pincode})",
            "instructions": "Unboxed craft le jaakar CSC kendra par dikhayein. VLE packing aur barcode karega.",
            "status": "PIN_ACTIVE_READY_FOR_DROPOFF",
            "expires_in_hours": 48,
            "created_at": datetime.now(timezone.utc).isoformat()
        }

logistics_service = LogisticsService()


