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
    with patch(
        "app.api.v1.studio.cv_service.enhance_image",
        return_value=(b"\x89PNG\r\n\x1a\nfake", 0.85),
    ):
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
        passport_hash="a" * 64,
        shortcode="M3B-77L",
        qr_code_data_uri="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
        verification_url="https://artifybharat.in/verify/M3B-77L",
        payload_snapshot={},
    )
    return artisan, product, pricing, passport


def test_gem_xml_and_csv_generation():
    artisan, product, pricing, passport = _create_mock_entities()

    # XML generation test
    xml_str = export_adapter_service.format_for_gem_xml(
        product, artisan, pricing, passport
    )
    assert isinstance(xml_str, str)
    root = ET.fromstring(xml_str)
    assert root.tag == "gem_catalog"
    assert root.attrib.get("version") == "3.0"

    seller = root.find("seller_details")
    assert seller is not None
    org_name = seller.find("organization_name")
    assert (
        org_name is not None and org_name.text == f"{artisan.name} Handloom Enterprise"
    )
    art_state = seller.find("artisan_state")
    assert art_state is not None and art_state.text == "Bihar"

    prod_el = root.find("product_details")
    assert prod_el is not None
    hsn = prod_el.find("hsn_code")
    assert hsn is not None and hsn.text == "50072010"
    country = prod_el.find("country_of_origin")
    assert country is not None and country.text == "India"
    base_price = prod_el.find("base_price_inr")
    assert (
        base_price is not None
        and base_price.text is not None
        and float(base_price.text) == 4800.0
    )

    auth_el = root.find("authenticity_verification")
    assert auth_el is not None
    p_hash = auth_el.find("digital_passport_hash")
    assert p_hash is not None and p_hash.text == "a" * 64
    v_url = auth_el.find("verification_url")
    assert v_url is not None and v_url.text == "https://artifybharat.in/verify/M3B-77L"

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

    payload = export_adapter_service.format_for_ondc(
        product, artisan, pricing, passport
    )
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
    bad_currency["message"]["catalog"]["bpp/providers"][0]["items"][0]["price"][
        "currency"
    ] = "USD"
    with pytest.raises(
        ValueError,
        match="ONDC Beckn schema validation failed: price currency must be INR",
    ):
        export_adapter_service.validate_ondc_beckn_schema(bad_currency)

    # 3. Missing passport tag
    bad_tags = copy.deepcopy(payload)
    bad_tags["message"]["catalog"]["bpp/providers"][0]["items"][0]["tags"] = [
        {"code": "other", "value": "x"}
    ]
    with pytest.raises(ValueError, match="heritage_passport"):
        export_adapter_service.validate_ondc_beckn_schema(bad_tags)

    # 4. format_for_ondc rejecting None/missing
    with pytest.raises(ValueError):
        export_adapter_service.format_for_ondc(None, artisan, pricing, passport)  # type: ignore


def test_whatsapp_catalog_card_export():
    artisan, product, pricing, passport = _create_mock_entities()

    from urllib.parse import urlparse, parse_qs

    # Test with explicit verified UPI ID
    card = export_adapter_service.format_for_whatsapp(
        product, artisan, pricing, passport, upi_id="sita.devi@sbi"
    )
    assert isinstance(card, dict)

    assert card["messaging_product"] == "whatsapp"
    assert card["type"] == "interactive"

    interactive = card["interactive"]
    assert interactive["type"] == "cta_url"
    assert interactive["header"]["type"] == "image"
    assert interactive["header"]["image"]["link"] == product.enhanced_image_path

    body_text = interactive["body"]["text"]
    assert product.title in body_text
    assert "4800" in body_text
    assert passport.shortcode in body_text
    assert passport.verification_url in body_text

    meta = card["metadata"]
    assert meta["digital_passport_hash"] == passport.passport_hash
    assert meta["shortcode"] == passport.shortcode
    assert meta["upi_payment_link"].startswith("upi://pay?")
    parsed = urlparse(meta["upi_payment_link"])
    qs = parse_qs(parsed.query)
    assert qs["pa"] == ["sita.devi@sbi"]
    assert meta["base_price_inr"] == 4800.0

    # Test fallback UPI VPA does not leak phone
    card_fallback = export_adapter_service.format_for_whatsapp(
        product, artisan, pricing, passport
    )
    parsed_fallback = urlparse(card_fallback["metadata"]["upi_payment_link"])
    qs_fallback = parse_qs(parsed_fallback.query)
    assert qs_fallback["pa"] == [f"artisan-{artisan.id[:8]}@upi"]
    assert artisan.phone not in card_fallback["metadata"]["upi_payment_link"]

    # Test rejection of empty passport_hash
    bad_pass = HeritagePassport(
        id="bad",
        product_id=product.id,
        passport_hash="",
        shortcode="M3B-77L",
        qr_code_data_uri="uri",
        verification_url="url",
        payload_snapshot={},
    )
    with pytest.raises(ValueError, match="passport_hash"):
        export_adapter_service.format_for_whatsapp(product, artisan, pricing, bad_pass)
    with pytest.raises(ValueError, match="passport_hash"):
        export_adapter_service.format_for_shg_csv(product, artisan, pricing, bad_pass)


def test_shg_bulk_wholesale_csv_export():
    artisan, product, pricing, passport = _create_mock_entities()

    # Test format_for_shg_csv math (15 qty at 20 pct off)
    shg_data = export_adapter_service.format_for_shg_csv(
        product, artisan, pricing, passport, min_quantity=15, discount_pct=20.0
    )
    assert isinstance(shg_data, dict)
    assert shg_data["standard_retail_price_inr"] == 4800.0
    assert shg_data["minimum_wholesale_quantity"] == 15
    assert shg_data["wholesale_discount_percentage"] == 20.0
    # 4800 * (1 - 0.20) = 3840.0
    assert shg_data["wholesale_unit_price_inr"] == 3840.0
    # 3840 * 15 = 57600.0
    assert shg_data["total_lot_price_inr"] == 57600.0
    assert shg_data["digital_passport_hash"] == passport.passport_hash
    assert shg_data["shortcode"] == "M3B-77L"
    assert shg_data["production_lead_time_days"] == int(8.0 * (15 / 2))

    # Test to_shg_csv serialization
    csv_str = export_adapter_service.to_shg_csv(
        product, artisan, pricing, passport, min_quantity=15, discount_pct=20.0
    )
    assert isinstance(csv_str, str)
    reader = csv.DictReader(io.StringIO(csv_str))
    rows = list(reader)
    assert len(rows) == 1
    row = rows[0]
    assert float(row["standard_retail_price_inr"]) == 4800.0
    assert int(row["minimum_wholesale_quantity"]) == 15
    assert float(row["wholesale_discount_percentage"]) == 20.0
    assert float(row["wholesale_unit_price_inr"]) == 3840.0
    assert float(row["total_lot_price_inr"]) == 57600.0
    assert row["digital_passport_hash"] == "a" * 64
    assert row["shortcode"] == "M3B-77L"
    assert row["verification_url"] == "https://artifybharat.in/verify/M3B-77L"


@pytest.mark.asyncio
async def test_multi_channel_export(client: AsyncClient):
    # Setup complete pipeline
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "name": "Sita Devi",
            "phone": "9845098450",
            "pin": "9900",
            "trifed_id": "TRIFED-BH-101",
        },
    )
    artisan_id = reg.json()["artisan_id"]

    from tests.test_cv_enhancement import create_dummy_image_bytes

    files = {
        "image": ("craft.jpg", io.BytesIO(create_dummy_image_bytes()), "image/jpeg")
    }
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


@pytest.mark.asyncio
async def test_end_to_end_all_channels_export(client: AsyncClient):
    # Register artisan
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "name": "Radha Devi",
            "phone": "9876543210",
            "pin": "1234",
            "trifed_id": "TRIFED-UP-555",
        },
    )
    assert reg.status_code == 201
    artisan_id = reg.json()["artisan_id"]

    # Studio enhance
    files = {"image": ("saree.jpg", io.BytesIO(b"fake-image-bytes"), "image/jpeg")}
    data = {"artisan_id": artisan_id, "product_title": "Banarasi Brocade Saree"}
    enhance_res = await client.post("/api/v1/studio/enhance", data=data, files=files)
    assert enhance_res.status_code == 200
    product_id = enhance_res.json()["product_id"]

    # Calculate fair pricing
    price_res = await client.post(
        "/api/v1/pricing/calculate",
        json={
            "product_id": product_id,
            "raw_material_cost": 3200.0,
            "labor_days": 12.0,
        },
    )
    assert price_res.status_code == 200

    # Issue passport
    pass_res = await client.post(
        "/api/v1/passport/issue", json={"product_id": product_id}
    )
    assert pass_res.status_code == 200
    issued_passport_hash = pass_res.json()["passport_hash"]

    # Export to all 5 channels: GeM, ONDC, WhatsApp, SHG_Bulk, Direct_B2B
    all_channels_payload = {
        "product_id": product_id,
        "target_channels": ["GeM", "ONDC", "WhatsApp", "SHG_Bulk", "Direct_B2B"],
        "b2b_bulk_min_quantity": 20,
        "b2b_bulk_discount_percentage": 25.0,
    }
    sync_res = await client.post("/api/v1/exports/sync", json=all_channels_payload)
    assert sync_res.status_code == 200
    sync_data = sync_res.json()

    assert sync_data["product_id"] == product_id
    assert sync_data["passport_hash"] == issued_passport_hash
    assert len(sync_data["results"]) == 5

    res_by_channel = {r["channel"]: r for r in sync_data["results"]}

    # GeM assertions (plain 'GeM' exports JSON catalog dictionary)
    assert "GeM" in res_by_channel
    assert res_by_channel["GeM"]["status"] == "synced"
    assert res_by_channel["GeM"]["format"] == "JSON"

    # ONDC assertions
    assert "ONDC" in res_by_channel
    assert res_by_channel["ONDC"]["status"] == "synced"
    assert res_by_channel["ONDC"]["format"] == "JSON_BECKN"

    # WhatsApp assertions
    assert "WhatsApp" in res_by_channel
    assert res_by_channel["WhatsApp"]["status"] == "synced"
    assert res_by_channel["WhatsApp"]["format"] == "WHATSAPP_INTERACTIVE"

    # SHG_Bulk assertions
    assert "SHG_Bulk" in res_by_channel
    assert res_by_channel["SHG_Bulk"]["status"] == "synced"
    assert res_by_channel["SHG_Bulk"]["format"] == "CSV"

    # Direct_B2B assertions
    assert "Direct_B2B" in res_by_channel
    assert res_by_channel["Direct_B2B"]["status"] == "synced"
    assert res_by_channel["Direct_B2B"]["format"] == "REST_API"


@pytest.mark.asyncio
async def test_multi_channel_inventory_lock_on_sale(client: AsyncClient, db_session):
    # Setup product with passport and 3 channels
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "name": "Govind Ji",
            "phone": "9123456780",
            "pin": "4321",
            "trifed_id": "TRIFED-RJ-909",
        },
    )
    artisan_id = reg.json()["artisan_id"]

    files = {"image": ("craft.jpg", io.BytesIO(b"dummy"), "image/jpeg")}
    data = {"artisan_id": artisan_id, "product_title": "Blue Pottery Vase"}
    enhance_res = await client.post("/api/v1/studio/enhance", data=data, files=files)
    product_id = enhance_res.json()["product_id"]

    await client.post(
        "/api/v1/pricing/calculate",
        json={"product_id": product_id, "raw_material_cost": 500.0, "labor_days": 4.0},
    )
    await client.post("/api/v1/passport/issue", json={"product_id": product_id})

    # Export to GeM, ONDC, and WhatsApp
    export_payload = {
        "product_id": product_id,
        "target_channels": ["GeM", "ONDC", "WhatsApp"],
    }
    await client.post("/api/v1/exports/sync", json=export_payload)

    # Now unique 1-of-1 handcrafted item purchased on ONDC
    lock_result = await export_adapter_service.lock_inventory_on_sale(
        db=db_session, product_id=product_id, originating_channel="ONDC"
    )

    assert lock_result["inventory_locked"] is True
    assert lock_result["status"] == "sold_out"
    assert lock_result["purchased_on"] == "ONDC"
    # GeM and WhatsApp should be delisted
    delisted = [c.lower() for c in lock_result["delisted_from_channels"]]
    assert "gem" in delisted
    assert "whatsapp" in delisted
    assert "ondc" not in delisted

    # Concurrency / double-sale guard: re-attempting lock raises ValueError
    with pytest.raises(ValueError, match="already sold out"):
        await export_adapter_service.lock_inventory_on_sale(
            db=db_session, product_id=product_id, originating_channel="GeM"
        )
