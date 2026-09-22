"""Seeded products must carry resolvable Heritage Passports.

Covers the buyer-portal "Passport Not Found" bug: quick samples
ABC123 / VRN456 / MDB789 must resolve against the real backend after
seeding (frontend mock mode already works via MOCK_PRODUCTS).
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest
from sqlalchemy import func, select

BACKEND_ROOT = Path(__file__).resolve().parent.parent
SEED_PATH = BACKEND_ROOT / "scripts" / "seed_test_accounts.py"


def load_seed_module():
    spec = importlib.util.spec_from_file_location("seed_test_accounts_pp", SEED_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules["seed_test_accounts_pp"] = module
    spec.loader.exec_module(module)
    return module


seed_mod = load_seed_module()

# Frontend quick samples (unhyphenated) -> pinned hyphenated DB codes.
EXPECTED_SHORTCODES = {
    "prod-001": "ABC-123",
    "prod-002": "VRN-456",
    "prod-003": "MDB-789",
}
QUICK_SAMPLES = ["ABC123", "VRN456", "MDB789"]


def test_seed_products_pin_frontend_sample_shortcodes():
    by_id = {item["id"]: item for item in seed_mod.SEED_PRODUCTS}
    for pid, code in EXPECTED_SHORTCODES.items():
        assert by_id[pid]["shortcode"] == code


@pytest.mark.asyncio
async def test_seed_issues_resolvable_passports(db_session):
    from app.services.passport_service import passport_service

    result = await seed_mod.seed(db_session, with_images=False)

    for pid, code in EXPECTED_SHORTCODES.items():
        assert result[f"passport:{pid}"] == code

    for sample in QUICK_SAMPLES:
        data = await passport_service.resolve_shortcode(sample, db_session)
        assert data is not None, f"{sample} should resolve after seeding"
        assert data["is_authentic"] is True


@pytest.mark.asyncio
async def test_seed_passports_idempotent(db_session):
    from app.models.passport import HeritagePassport
    from app.services.passport_service import passport_service

    await seed_mod.seed(db_session, with_images=False)
    result = await seed_mod.seed(db_session, with_images=False)

    for pid, code in EXPECTED_SHORTCODES.items():
        assert result[f"passport:{pid}"] == code
        data = await passport_service.resolve_shortcode(code, db_session)
        assert data is not None

    count = (
        await db_session.execute(
            select(func.count())
            .select_from(HeritagePassport)
            .where(HeritagePassport.product_id.in_(list(EXPECTED_SHORTCODES)))
        )
    ).scalar_one()
    assert count == 3


@pytest.mark.asyncio
async def test_seed_pricing_coherent(db_session):
    from app.models.pricing import ProductPricing

    await seed_mod.seed(db_session, with_images=False)

    for pid in EXPECTED_SHORTCODES:
        row = (
            await db_session.execute(
                select(ProductPricing).where(ProductPricing.product_id == pid)
            )
        ).scalar_one_or_none()
        assert row is not None, f"{pid} should have seeded pricing"
        assert row.final_price > 0
        assert row.final_price >= row.calculated_fair_wage


@pytest.mark.asyncio
async def test_verify_response_exposes_shortcode(client):
    res = await client.get("/api/v1/passport/code/A7X-9B2")
    assert res.status_code == 200
    assert res.json()["shortcode"] == "A7X-9B2"


@pytest.mark.asyncio
async def test_issue_response_includes_print_assets(client):
    """#99: single issue call must render QR + 58mm print preview (no 2nd fetch)."""
    import io

    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "name": "Print Asset Artisan",
            "phone": "9845098400",
            "pin": "9900",
            "trifed_id": "TRIFED-BH-199",
        },
    )
    assert reg.status_code in (200, 201)
    artisan_id = reg.json()["artisan_id"]
    access_token = reg.json()["access_token"]

    from tests.test_cv_enhancement import create_dummy_image_bytes

    files = {
        "image": ("craft.jpg", io.BytesIO(create_dummy_image_bytes()), "image/jpeg")
    }
    enhance_res = await client.post(
        "/api/v1/studio/enhance",
        data={"artisan_id": artisan_id, "product_title": "Print Asset Dupatta"},
        files=files,
        headers={"Authorization": f"Bearer {access_token}"},
    )
    product_id = enhance_res.json()["product_id"]
    await client.post(
        "/api/v1/pricing/calculate",
        json={"product_id": product_id, "raw_material_cost": 400.0, "labor_days": 8.0},
    )

    issue = await client.post("/api/v1/passport/issue", json={"product_id": product_id})
    assert issue.status_code == 200
    body = issue.json()
    for field in (
        "shortcode",
        "qr_code_data_uri",
        "qr_svg_data_uri",
        "escpos_b64",
        "verification_url",
    ):
        assert body.get(field), f"issue response missing printable {field}"
    assert body["qr_svg_data_uri"].startswith("data:image/svg+xml;base64,")
    assert body["verification_url"].endswith(body["shortcode"])

    by_code = await client.get(f"/api/v1/passport/code/{body['shortcode']}")
    assert by_code.status_code == 200
    for field in ("qr_svg_data_uri", "escpos_b64", "verification_url"):
        assert by_code.json().get(field), f"code view missing {field}"

    by_hash = await client.get(f"/api/v1/passport/verify/{body['passport_hash']}")
    assert by_hash.status_code == 200
    for field in ("qr_svg_data_uri", "escpos_b64", "verification_url"):
        assert by_hash.json().get(field), f"verify view missing {field}"
