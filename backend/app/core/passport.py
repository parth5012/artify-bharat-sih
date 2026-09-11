import hashlib
import json
import io
import base64
from typing import Optional
import qrcode
from app.config import get_settings

settings = get_settings()


def generate_passport_hash(
    artisan_id: str,
    trifed_id: Optional[str],
    geo_lat: Optional[float],
    geo_lng: Optional[float],
    product_title: str,
    craft_category: str,
    timestamp_iso: str,
    raw_material_cost: float,
    labor_days: float,
) -> str:
    """
    Computes a deterministic SHA-256 cryptographic hash combining:
    - Artisan identity & Government credentials (TRIFED / Pehchan ID)
    - Geo-coordinates of workshop/cluster
    - Creation timestamp
    - Product payload (title, category, raw materials, labor investment)

    DPDP note: ``trifed_id`` is consumed in-memory only for hash stability
    (callers pass the detokenized value). It is never persisted in payload
    snapshots or the shortcode index — see passport_service.
    """
    payload_data = {
        "artisan_id": str(artisan_id),
        "trifed_id": str(trifed_id or ""),
        "geo_lat": round(geo_lat, 6) if geo_lat is not None else None,
        "geo_lng": round(geo_lng, 6) if geo_lng is not None else None,
        "product_title": product_title.strip(),
        "craft_category": craft_category.strip().lower(),
        "timestamp": timestamp_iso,
        "raw_material_cost": round(raw_material_cost, 2),
        "labor_days": round(labor_days, 1),
    }

    canonical_json = json.dumps(payload_data, sort_keys=True, separators=(',', ':'))
    hash_digest = hashlib.sha256(canonical_json.encode('utf-8')).hexdigest()
    return hash_digest


def generate_passport_qr_code(passport_hash: str) -> str:
    """
    Generates a high-contrast QR code image encoding the public verification URL.
    Returns base64 data URI string suitable for direct frontend rendering and inclusion in product labels.
    """
    verification_url = f"{settings.PASSPORT_VERIFICATION_BASE_URL}/{passport_hash}"
    qr = qrcode.QRCode(
        version=1,
        box_size=10,
        border=4,
    )
    qr.add_data(verification_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    buffered = io.BytesIO()
    img.save(buffered, "PNG")
    img_bytes = buffered.getvalue()
    b64_str = base64.b64encode(img_bytes).decode("utf-8")
    return f"data:image/png;base64,{b64_str}"
