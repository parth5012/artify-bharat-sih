import pytest
import io
import csv
import xml.etree.ElementTree as ET
from unittest.mock import patch
from httpx import AsyncClient
from app.services.export_service import export_adapter_service
from app.models.artisan import Artisan
from app.models.product import Product
from app.models.pricing import ProductPricing
from app.models.passport import HeritagePassport

# Mock heavy background removal so export adapter tests run fast and deterministically
@pytest.fixture(autouse=True)
def mock_cv_enhance():
    with patch("app.api.v1.studio.cv_service.enhance_image", return_value=(b"\x89PNG\r\n\x1a\nfake", 0.85)):
        yield


def _create_mock_entities():
    artisan = Artisan(
        id="artisan-uuid-001",
        name="Sita Devi",
        phone="9845098450",
        pin_hash="hashed_pin",
        state="Bihar",
        district="Madhubani",
        cluster_name="Madhubani Painting Cluster",
        trifed_id="TRIFED-BH-101",
        pehchan_id="PEHCHAN-9988",
        is_verified=True,
    )
    product = Product(
        id="product-uuid-001",
        artisan_id=artisan.id,
        title="Madhubani Handpainted Silk Dupatta",
        description="Authentic handmade Madhubani silk dupatta crafted with natural dyes",
        craft_category="handloom",
        gi_tag_status="Madhubani Paintings (GI-38)",
        enhanced_image_path="https://artifybharat.in/storage/enhanced_product.png",
        status="passport_issued",
    )
    pricing = ProductPricing(
        id="pricing-uuid-001",
        product_id=product.id,
        raw_material_cost=400.0,
        labor_days=8.0,
        calculated_fair_wage=3600.0,
        recommended_price=4800.0,
        final_price=4800.0,
    )
    passport = HeritagePassport(
        id="passport-uuid-001",
        product_id=product.id,
        passport_hash="a"*64,
        shortcode="M3B-77L",
        qr_code_data_uri="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
        verification_url="https://artifybharat.in/verify/M3B-77L",
        payload_snapshot={},
    )
    return artisan, product, pricing, passport


def test_gem_xml_and_csv_generation():
    artisan, product, pricing, passport = _create_mock_entities()

    # XML generation test
    xml_str = export_adapter_service.format_for_gem_xml(product, artisan, pricing, passport)
    assert isinstance(xml_str, str)
    root = ET.fromstring(xml_str)
    assert root.tag == "gem_catalog"
    assert root.attrib.get("version") == "3.0"

    seller = root.find("seller_details")
    assert seller is not None
    assert seller.find("organization_name").text == f"{artisan.name} Handloom Enterprise"
    assert seller.find("artisan_state").text == "Bihar"

    prod_el = root.find("product_details")
    assert prod_el is not None
    assert prod_el.find("hsn_code").text == "50072010"
    assert prod_el.find("country_of_origin").text == "India"
    assert float(prod_el.find("base_price_inr").text) == 4800.0

    auth_el = root.find("authenticity_verification")
    assert auth_el is not None
    assert auth_el.find("digital_passport_hash").text == "a" * 64
    assert auth_el.find("verification_url").text == "https://artifybharat.in/verify/M3B-77L"

    # CSV generation test
    csv_str = export_adapter_service.to_gem_csv(product, artisan, pricing, passport)
    assert isinstance(csv_str, str)
    reader = csv.DictReader(io.StringIO(csv_str))
    rows = list(reader)
    assert len(rows) == 1
    row = rows[0]
    assert row["hsn_code"] == "50072010"
    assert row["digital_passport_hash"] == "a" * 64
    assert row["verification_url"] == "https://artifybharat.in/verify/M3B-77L"
    assert float(row["base_price_inr"]) == 4800.0


def test_ondc_beckn_catalog_export():
    artisan, product, pricing, passport = _create_mock_entities()

    payload = export_adapter_service.format_for_ondc(product, artisan, pricing, passport)
    assert isinstance(payload, dict)

    # Valid schema check
    assert export_adapter_service.validate_ondc_beckn_schema(payload) is True

    # Context assertions
    ctx = payload["context"]
    assert ctx["country"] == "IND"
    assert ctx["action"] == "on_search"
    assert "bpp_id" in ctx
    assert "domain" in ctx

    # Message / catalog assertions
    catalog = payload["message"]["catalog"]
    providers = catalog["bpp/providers"]
    assert len(providers) >= 1
    provider = providers[0]
    assert provider["id"] == artisan.id
    assert provider["descriptor"]["name"] == artisan.name

    items = provider["items"]
    assert len(items) >= 1
    item = items[0]
    assert item["id"] == product.id
    assert item["price"]["currency"] == "INR"
    assert float(item["price"]["value"]) == 4800.0

    tags = item["tags"]
    tag_map = {t["code"]: t["value"] for t in tags}
    assert "heritage_passport" in tag_map
    assert tag_map["heritage_passport"] == "a" * 64
    assert tag_map["cluster"] == "Madhubani Painting Cluster"

    # Schema validation rejection tests
    # 1. Missing context
    with pytest.raises(ValueError, match="ONDC Beckn schema validation failed"):
        export_adapter_service.validate_ondc_beckn_schema({"message": {}})

    # 2. Wrong currency
    import copy
    bad_currency = copy.deepcopy(payload)
    bad_currency["message"]["catalog"]["bpp/providers"][0]["items"][0]["price"]["currency"] = "USD"
    with pytest.raises(ValueError, match="ONDC Beckn schema validation failed: price currency must be INR"):
        export_adapter_service.validate_ondc_beckn_schema(bad_currency)

    # 3. Missing passport tag
    bad_tags = copy.deepcopy(payload)
    bad_tags["message"]["catalog"]["bpp/providers"][0]["items"][0]["tags"] = [{"code": "other", "value": "x"}]
    with pytest.raises(ValueError, match="heritage_passport"):
        export_adapter_service.validate_ondc_beckn_schema(bad_tags)

    # 4. format_for_ondc rejecting None/missing
    with pytest.raises(ValueError):
        export_adapter_service.format_for_ondc(None, artisan, pricing, passport)  # type: ignore




@pytest.mark.asyncio
async def test_multi_channel_export(client: AsyncClient):
    # Setup complete pipeline
    reg = await client.post(
        "/api/v1/auth/register",
        json={"name": "Sita Devi", "phone": "9845098450", "pin": "9900", "trifed_id": "TRIFED-BH-101"},
    )
    artisan_id = reg.json()["artisan_id"]

    from tests.test_cv_enhancement import create_dummy_image_bytes
    files = {"image": ("craft.jpg", io.BytesIO(create_dummy_image_bytes()), "image/jpeg")}
    data = {"artisan_id": artisan_id, "product_title": "Madhubani Silk Dupatta"}
    enhance_res = await client.post("/api/v1/studio/enhance", data=data, files=files)
    product_id = enhance_res.json()["product_id"]

    # Calculate pricing
    await client.post(
        "/api/v1/pricing/calculate",
        json={"product_id": product_id, "raw_material_cost": 400.0, "labor_days": 8.0},
    )

    # Issue passport
    await client.post("/api/v1/passport/issue", json={"product_id": product_id})

    # Export to GeM, ONDC, and B2B
    export_payload = {
        "product_id": product_id,
        "target_channels": ["GeM", "ONDC", "Direct_B2B"],
        "b2b_bulk_min_quantity": 15,
        "b2b_bulk_discount_percentage": 20.0,
    }
    export_res = await client.post("/api/v1/exports/sync", json=export_payload)
    assert export_res.status_code == 200
    exp_data = export_res.json()
    assert len(exp_data["results"]) == 3
    channels = [r["channel"] for r in exp_data["results"]]
    assert "GeM" in channels
    assert "ONDC" in channels
    assert "Direct_B2B" in channels
