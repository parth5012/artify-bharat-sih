import base64
import re
import xml.etree.ElementTree as ET
from typing import Any
from unittest.mock import patch

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.config import get_settings
from app.core.passport import (
    compute_wip_digest,
    generate_passport_hash,
    generate_passport_qr_svg_data_uri,
    generate_passport_qr_svg_xml,
)
from app.services.passport_service import (
    generate_shortcode,
    generate_escpos_thermal_bytes,
    passport_service,
)

@pytest.mark.asyncio
async def test_shortcode_passport_resolution(client: AsyncClient):
    # Standard hyphenated
    res = await client.get("/api/v1/passport/code/A7X-9B2")
    assert res.status_code == 200
    data = res.json()
    assert data["is_authentic"] is True
    assert data["artisan_name"] == "Radha Devi"
    assert data["cluster_name"] == "Varanasi Handloom Cluster"
    assert data["gi_tag_status"] == "Banarasi Brocade & Saree (GI-39)"
    assert data["cost_breakdown"]["raw_material_cost"] == 3200.0
    assert data["cost_breakdown"]["calculated_fair_wage"] == 4800.0
    assert data["cost_breakdown"]["total_suggested_price"] == 9800.0

    # Lowercase unhyphenated (robustness check for rural buyers)
    res_norm = await client.get("/api/v1/passport/code/a7x9b2")
    assert res_norm.status_code == 200
    assert res_norm.json()["artisan_name"] == "Radha Devi"

    # Multi-cluster showcase: Madhubani
    res_mdb = await client.get("/api/v1/passport/code/M3B-77L")
    assert res_mdb.status_code == 200
    assert res_mdb.json()["artisan_name"] == "Geeta Jha"
    assert "Mithila" in res_mdb.json()["cluster_name"]


def _hash_kwargs(**overrides: Any) -> Any:
    base: dict[str, Any] = dict(
        artisan_id="art-123",
        trifed_id="TRIFED-001",
        geo_lat=25.3176,
        geo_lng=82.9739,
        product_title="Banarasi Silk Saree",
        craft_category="Handloom",
        timestamp_iso="2026-09-07T12:00:00Z",
        raw_material_cost=500.0,
        labor_days=15.0,
        wip_sha256=compute_wip_digest("raw/wip_01.jpg"),
    )
    base.update(overrides)
    return base


def test_hash_determinism_wip_sensitivity_gps_rounding():
    h1 = generate_passport_hash(**_hash_kwargs())
    h2 = generate_passport_hash(**_hash_kwargs())
    assert h1 == h2
    assert len(h1) == 64
    # WIP change flips hash
    assert generate_passport_hash(**_hash_kwargs(wip_sha256=compute_wip_digest("raw/wip_02.jpg"))) != h1
    # Empty WIP digest stable
    assert generate_passport_hash(**_hash_kwargs(wip_sha256="")) == generate_passport_hash(
        **_hash_kwargs(wip_sha256="")
    )
    # GPS rounding stable to 6dp
    assert generate_passport_hash(**_hash_kwargs(geo_lat=25.31760004)) == h1
    assert generate_passport_hash(**_hash_kwargs(geo_lat=25.31761)) != h1
    # Tamper flips
    assert generate_passport_hash(**_hash_kwargs(product_title="Counterfeit")) != h1


def test_shortcode_format_determinism_collision():
    code = generate_shortcode("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")
    assert re.fullmatch(r"[0-9A-Za-z]{3}-[0-9A-Za-z]{3}", code)
    assert generate_shortcode("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855") == code
    # Salt-counter collision path yields a different, still valid code
    salted = generate_shortcode(
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", salt="1"
    )
    assert re.fullmatch(r"[0-9A-Za-z]{3}-[0-9A-Za-z]{3}", salted)


def test_svg_qr_watermark_xml_and_shortcode_url():
    settings = get_settings()
    shortcode = "A7X-9B2"
    svg = generate_passport_qr_svg_xml("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", shortcode)
    ET.fromstring(svg)  # validates as XML
    assert f"micro-watermark:{shortcode}" in svg
    assert shortcode in svg
    assert 'id="micro-watermark"' in svg
    # QR encodes the canonical shortcode verification URL
    captured = {}
    import qrcode as _qrcode

    OrigQR = _qrcode.QRCode

    class CapQR(OrigQR):
        def add_data(self, d, *a, **k):
            captured["url"] = d
            return super().add_data(d, *a, **k)

    with patch("qrcode.QRCode", CapQR):
        generate_passport_qr_svg_xml("deadbeef" * 8, shortcode)
    assert captured["url"] == f"{settings.PASSPORT_VERIFICATION_BASE_URL}/{shortcode}"
    # Data-URI round-trips to the same SVG
    uri = generate_passport_qr_svg_data_uri("deadbeef" * 8, shortcode)
    assert uri.startswith("data:image/svg+xml;base64,")
    assert base64.b64decode(uri.split(",", 1)[1]).decode("utf-8") == generate_passport_qr_svg_xml(
        "deadbeef" * 8, shortcode
    )


def test_escpos_bytes_58mm_layout():
    b64 = generate_escpos_thermal_bytes("A7X-9B2", "Handwoven Banarasi Katan Silk Saree", "Radha Devi", 9800.0)
    raw = base64.b64decode(b64)
    assert raw[:2] == b"\x1b\x40"  # ESC @ init
    assert raw[-4:] == b"\x1d\x56\x41\x00"  # GS V A cut
    assert b"CODE: A7X-9B2" in raw
    assert b"verify.artifybharat.in" in raw
    assert b"Rs. 9800" in raw
    # 58mm printable width: every text line <= 32 cols (strip ESC control bytes)
    ansi = re.compile(rb"\x1b.|[\x00-\x08\x0b\x0c\x0e-\x1f]")
    for line in raw.decode("utf-8", errors="replace").split("\n"):
        printable = ansi.sub(b"", line.encode("utf-8", errors="replace")).decode("utf-8", errors="replace")
        assert len(printable) <= 32, f"line too wide ({len(printable)}): {printable!r}"
    # Long titles wrap instead of truncating
    long_raw = base64.b64decode(
        generate_escpos_thermal_bytes("M3B-77L", "Tree of Life Mithila Folk Painting Extra Long Title Wrapping", "Geeta Jha", 4000.0)
    )
    assert b"Mithila" in long_raw


@pytest.mark.asyncio
async def test_shortcode_resolve_case_hyphen_robustness():
    for variant in ["A7X-9B2", "a7x-9b2", "A7X9B2", "a7x9b2", " a7x-9b2 ", "A7X_9B2"]:
        data = await passport_service.resolve_shortcode(variant, None)
        assert data is not None
        assert data["artisan_name"] == "Radha Devi"
    assert await passport_service.resolve_shortcode("ZZZ-999", None) is None

