import pytest
import io
from httpx import AsyncClient
from app.core.passport import generate_passport_hash, generate_passport_qr_code


def test_passport_hash_determinism():
    h1 = generate_passport_hash(
        artisan_id="art-123",
        trifed_id="TRIFED-001",
        geo_lat=25.3176,
        geo_lng=82.9739,
        product_title="Banarasi Silk Saree",
        craft_category="handloom",
        timestamp_iso="2026-09-07T12:00:00Z",
        raw_material_cost=500.0,
        labor_days=15.0,
    )
    h2 = generate_passport_hash(
        artisan_id="art-123",
        trifed_id="TRIFED-001",
        geo_lat=25.3176,
        geo_lng=82.9739,
        product_title="Banarasi Silk Saree",
        craft_category="handloom",
        timestamp_iso="2026-09-07T12:00:00Z",
        raw_material_cost=500.0,
        labor_days=15.0,
    )
    assert h1 == h2
    assert len(h1) == 64  # SHA-256 hex string

    # Tampering test
    h_tampered = generate_passport_hash(
        artisan_id="art-123",
        trifed_id="TRIFED-001",
        geo_lat=25.3176,
        geo_lng=82.9739,
        product_title="Counterfeit Silk Saree",
        craft_category="handloom",
        timestamp_iso="2026-09-07T12:00:00Z",
        raw_material_cost=500.0,
        labor_days=15.0,
    )
    assert h1 != h_tampered


def test_qr_code_generation():
    qr_data = generate_passport_qr_code("abcdef1234567890abcdef1234567890")
    assert qr_data.startswith("data:image/png;base64,")


@pytest.mark.asyncio
async def test_passport_issuance_and_public_verification(client: AsyncClient):
    # Setup full product lifecycle
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "name": "Ram Prasad",
            "phone": "9911223344",
            "pin": "7777",
            "trifed_id": "TRIFED-UP-789",
        },
    )
    artisan_id = reg.json()["artisan_id"]

    from tests.test_cv_enhancement import create_dummy_image_bytes
    files = {"image": ("craft.jpg", io.BytesIO(create_dummy_image_bytes()), "image/jpeg")}
    data = {"artisan_id": artisan_id, "product_title": "GI Banarasi Brocade"}
    enhance_res = await client.post("/api/v1/studio/enhance", data=data, files=files)
    product_id = enhance_res.json()["product_id"]

    # Add pricing
    await client.post(
        "/api/v1/pricing/calculate",
        json={"product_id": product_id, "raw_material_cost": 600.0, "labor_days": 12.0},
    )

    # Issue passport
    issue_res = await client.post("/api/v1/passport/issue", json={"product_id": product_id})
    assert issue_res.status_code == 200
    passport_data = issue_res.json()
    assert "passport_hash" in passport_data
    assert passport_data["qr_code_data_uri"].startswith("data:image/png;base64,")
    passport_hash = passport_data["passport_hash"]

    # Public Buyer Verification test
    verify_res = await client.get(f"/api/v1/passport/verify/{passport_hash}")
    assert verify_res.status_code == 200
    v_data = verify_res.json()
    assert v_data["is_authentic"] is True
    assert v_data["artisan_name"] == "Ram Prasad"
    assert "cost_breakdown" in v_data
    assert v_data["cost_breakdown"]["raw_material_cost"] == 600.0


@pytest.mark.asyncio
async def test_public_passport_allowlist_fields_omits_sensitive_pii(client: AsyncClient):
    """
    DPDP Act 2023 Compliance & Privacy Allowlist Enforcement:
    Asserts that public passport verification payloads only expose strictly allowed public fields,
    and sensitive internal credentials (trifed_id, pehchan_id, eshram_uan, phone, pin_hash, bank_account)
    are excluded from public responses.
    """
    # Verify using pre-indexed sample shortcode
    res = await client.get("/api/v1/passport/code/A7X-9B2")
    assert res.status_code == 200
    data = res.json()

    approved_public_fields = {
        "passport_hash",
        "shortcode",
        "is_authentic",
        "product_title",
        "craft_category",
        "gi_tag_status",
        "artisan_name",
        "cluster_name",
        "state",
        "district",
        "geo_coordinates",
        "enhanced_image_url",
        "voice_story_url",
        "cost_breakdown",
        "issued_at",
    }

    # All returned keys must be in the approved allowlist
    assert set(data.keys()).issubset(approved_public_fields)

    # Sensitive PII must NOT be present
    forbidden_sensitive_fields = ["trifed_id", "pehchan_id", "eshram_uan", "phone", "aadhaar", "bank_account", "pin_hash"]
    for field in forbidden_sensitive_fields:
        assert field not in data, f"Sensitive field '{field}' was leaked in public verification payload!"

