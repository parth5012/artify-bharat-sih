import hashlib
import json
import io
import base64
import xml.sax.saxutils as saxutils
from typing import Optional
import qrcode
from app.config import get_settings

settings = get_settings()


def compute_wip_digest(wip_ref: Optional[str]) -> str:
    """
    Derives a deterministic SHA-256 hex digest for the WIP photo reference
    (raw smartphone capture path/URL stored on the Product record).

    Empty/None refs yield "" so passports issued before a WIP capture remain
    stable and hashable. Non-empty refs are hashed as UTF-8 bytes.
    """
    if not wip_ref:
        return ""
    return hashlib.sha256(str(wip_ref).encode("utf-8")).hexdigest()


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
    wip_sha256: Optional[str] = None,
) -> str:
    """
    Computes a deterministic SHA-256 cryptographic hash combining:
    - Artisan identity & Government credentials (TRIFED / Pehchan ID)
    - Geo-coordinates of workshop/cluster (rounded to 6dp for stability)
    - Creation timestamp
    - Product payload (title, category, raw materials, labor investment)
    - WIP photo digest (SHA-256 of the raw/WIP capture reference)

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
        "wip_sha256": str(wip_sha256 or "").strip().lower(),
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


def generate_passport_qr_svg_xml(passport_hash: str, shortcode: Optional[str] = None) -> str:
    """
    Generates a vector QR code (SVG) encoding the public verification URL.

    Uses ``qrcode`` with the ``SvgImage`` image factory. When ``shortcode``
    is provided, a faint micro-watermark (SVG comment + tiny low-opacity
    ``<text>`` in the quiet-zone margin) is embedded without overlaying
    QR modules, so scannability is preserved.

    Returns raw SVG XML string (parseable via ``xml.etree.ElementTree``).
    """
    from qrcode.image.svg import SvgImage

    verification_url = f"{settings.PASSPORT_VERIFICATION_BASE_URL}/{passport_hash}"
    qr = qrcode.QRCode(
        version=1,
        box_size=10,
        border=4,
    )
    qr.add_data(verification_url)
    qr.make(fit=True)

    img = qr.make_image(image_factory=SvgImage)
    buffered = io.BytesIO()
    img.save(buffered)
    svg_text = buffered.getvalue().decode("utf-8")
    if shortcode:
        esc = saxutils.escape(str(shortcode), {'"': '&quot;'})
        watermark = (
            f"<!-- micro-watermark:{esc} -->"
            f'<g id="micro-watermark" opacity="0.35">'
            f'<text x="99%" y="99%" text-anchor="end" '
            f'font-family="monospace" font-size="8" fill="#999999" opacity="0.35">'
            f"{esc}</text></g></svg>"
        )
        if "</svg>" in svg_text:
            svg_text = svg_text.rsplit("</svg>", 1)[0] + watermark
        else:
            svg_text = svg_text + watermark
    return svg_text


def generate_passport_qr_svg(passport_hash: str, shortcode: Optional[str] = None) -> str:
    """
    Vector QR SVG generator with embedded micro-watermark encoding the shortcode.

    Returns raw SVG XML (see :func:`generate_passport_qr_svg_xml`).
    Kept as the canonical entry point per Phase 4 Task 4.3 spec.
    """
    return generate_passport_qr_svg_xml(passport_hash, shortcode)


def generate_passport_qr_svg_data_uri(passport_hash: str, shortcode: Optional[str] = None) -> str:
    """
    SVG QR as a base64 data URI (``data:image/svg+xml;base64,...``),
    symmetric with :func:`generate_passport_qr_code` for frontend embedding.
    """
    svg_text = generate_passport_qr_svg_xml(passport_hash, shortcode)
    b64_str = base64.b64encode(svg_text.encode("utf-8")).decode("utf-8")
    return f"data:image/svg+xml;base64,{b64_str}"
