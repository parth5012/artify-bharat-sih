import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.mock_sandbox_service import mock_sandbox_service


@pytest.mark.asyncio
async def test_mock_eshram_kyc_success_default():
    """Verify default mock e-Shram & MoSJE Sandbox KYC lookup."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "uan_number": "1009-8876-5432",
            "aadhaar_last_four": "8832",
            "artisan_name": "Radha Devi",
            "state": "Haryana",
        }
        res = await ac.post("/api/v1/mock/auth/eshram-kyc", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["is_verified"] is True
        assert data["uan_number"] == "1009-8876-5432"
        assert data["artisan_name"] == "Radha Devi"
        assert data["state"] == "Haryana"
        assert data["district"] == "Gurugram"
        assert data["kyc_status"] == "AADHAAR_ESHRAM_LINKED_VERIFIED"
        assert data["direct_payout_escrow_account"]["account_mask"] == "XXXXXX8832"
        assert data["direct_payout_escrow_account"]["dbt_linked"] == "YES"

        schemes = {s["scheme_code"]: s for s in data["active_schemes"]}
        assert "PM-DAKSH-2026" in schemes
        assert "PM-SURAJ-CREDIT" in schemes
        assert "PMSYM-PENSION" in schemes
        assert "PEHCHAN-CARD" in schemes
        assert schemes["PM-DAKSH-2026"]["direct_benefit_transfer_ready"] is True
        assert data["total_potential_annual_benefit_inr"] == 98000.0


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "state_input,expected_district",
    [
        ("Bihar", "Madhubani"),
        ("Uttar Pradesh", "Varanasi"),
        ("Jammu & Kashmir", "Srinagar"),
        ("Gujarat", "Kutch"),
        ("Rajasthan", "Jaipur"),
        ("Telangana", "Yadadri Bhuvanagiri (Pochampally)"),
        ("Tamil Nadu", "Kanchipuram"),
    ],
)
async def test_mock_eshram_kyc_cluster_district_resolution(state_input, expected_district):
    """Verify cluster district resolution for different Indian artisan states."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "uan_number": "1009-1234-5678",
            "aadhaar_last_four": "1234",
            "artisan_name": "Master Artisan",
            "state": state_input,
        }
        res = await ac.post("/api/v1/mock/auth/eshram-kyc", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["is_verified"] is True
        assert data["state"] == state_input
        assert data["district"] == expected_district


@pytest.mark.asyncio
async def test_mock_logistics_pin_known_clusters():
    """Verify first-mile drop-off tracking PIN and nearest CSC center resolution across clusters."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        test_cases = [
            ("122001", "CSC-HR-GGM-014", "Gurugram Sadar CSC VLE Centre"),
            ("221001", "CSC-UP-VNS-042", "Varanasi Cantonment Rural CSC Kendra"),
            ("847211", "CSC-BR-MDB-108", "Madhubani Handicrafts Village Hub"),
            ("190001", "CSC-JK-SRN-029", "Srinagar Craft & Pashmina CSC Facilitation Centre"),
            ("370001", "CSC-GJ-BHJ-055", "Bhuj Artisan & Embroidery CSC Kendra"),
            ("508284", "CSC-TS-POC-019", "Pochampally Handloom Weavers CSC Service Kendra"),
            ("631501", "CSC-TN-KNC-033", "Kanchipuram Silk Weavers CSC Center"),
            ("302001", "CSC-RJ-JPR-088", "Jaipur Craft & Heritage CSC Kendra"),
            ("999999", "CSC-IND-RURAL-991", "Pradhan Mantri Gramin Digital Saksharta CSC Kendra"),
        ]

        for pincode, expected_center_id, expected_name in test_cases:
            payload = {
                "order_id": f"ORD-TEST-{pincode}",
                "artisan_id": f"ART-{pincode}",
                "origin_pincode": pincode,
                "destination_pincode": "110001",
                "weight_grams": 750,
            }
            res = await ac.post("/api/v1/mock/logistics/generate-pin", json=payload)
            assert res.status_code == 200
            data = res.json()
            assert data["order_id"] == f"ORD-TEST-{pincode}"
            assert data["artisan_id"] == f"ART-{pincode}"
            assert len(data["dropoff_tracking_pin"]) == 6
            assert data["dropoff_tracking_pin"].isdigit()
            assert data["speed_post_awb"].startswith("EK")
            assert data["speed_post_awb"].endswith("IN")
            assert data["barcode_format"] == "CODE-128"
            assert data["nearest_csc_center_id"] == expected_center_id
            assert data["nearest_center_name"] == expected_name
            assert data["distance_km"] > 0
            assert data["contact_person_vle"] != ""
            assert data["vle_phone"] != ""
            assert data["dropoff_deadline_hours"] == 48


@pytest.mark.asyncio
async def test_mock_logistics_pin_determinism():
    """Verify that same order_id + artisan_id returns deterministic drop-off PIN and Speed Post AWB."""
    res1 = mock_sandbox_service.generate_logistics_dropoff_pin(
        order_id="ORD-2026-SAME",
        artisan_id="ART-SAME",
        origin_pincode="221001",
    )
    res2 = mock_sandbox_service.generate_logistics_dropoff_pin(
        order_id="ORD-2026-SAME",
        artisan_id="ART-SAME",
        origin_pincode="221001",
    )
    assert res1["dropoff_tracking_pin"] == res2["dropoff_tracking_pin"]
    assert res1["speed_post_awb"] == res2["speed_post_awb"]
