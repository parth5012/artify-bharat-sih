import hashlib
import uuid
import random
from typing import Dict, Any, Optional
from datetime import datetime, timezone


class MockSandboxService:
    """
    Mock Government & Logistics Sandbox Verification Service (SIH PS 26090):
    1. e-Shram / MoSJE KYC lookup simulator returning verification status and active welfare scheme eligibility
       (PM-DAKSH, PM-SURAJ, PMSYM Pension, Artisan Health Insurance).
    2. India Post / CSC first-mile drop-off simulator generating 6-digit dropoff tracking PIN,
       India Post Speed Post AWB barcode, and nearest Village CSC center routing.
    """

    CSC_CENTERS_DIRECTORY = {
        "122001": {
            "center_id": "CSC-HR-GGM-014",
            "name": "Gurugram Sadar CSC VLE Centre",
            "address": "Shop 14, Main Market, Sadar Bazar, Gurugram, Haryana - 122001",
            "vle_name": "Ramesh Kumar Sharma",
            "vle_phone": "+919811223344",
            "distance_km": 1.4,
            "operating_hours": "09:00 AM - 07:00 PM (Mon-Sat)",
        },
        "221001": {
            "center_id": "CSC-UP-VNS-042",
            "name": "Varanasi Cantonment Rural CSC Kendra",
            "address": "Plot 8, Near Railway Station, Varanasi, Uttar Pradesh - 221001",
            "vle_name": "Amitesh Verma",
            "vle_phone": "+919450123456",
            "distance_km": 0.8,
            "operating_hours": "08:30 AM - 08:00 PM (All Days)",
        },
        "847211": {
            "center_id": "CSC-BR-MDB-108",
            "name": "Madhubani Handicrafts Village Hub",
            "address": "Gram Panchayat Bhawan, Jitwarpur, Madhubani, Bihar - 847211",
            "vle_name": "Sunita Devi",
            "vle_phone": "+919708912345",
            "distance_km": 0.5,
            "operating_hours": "09:00 AM - 06:00 PM (Mon-Sat)",
        },
        "default": {
            "center_id": "CSC-IND-RURAL-991",
            "name": "Pradhan Mantri Gramin Digital Saksharta CSC Kendra",
            "address": "Panchayat Bhawan, Sector 4, Rural Development Hub",
            "vle_name": "Rajendra Prasad",
            "vle_phone": "+919876500000",
            "distance_km": 1.2,
            "operating_hours": "09:00 AM - 06:30 PM (Mon-Sat)",
        },
    }

    def verify_eshram_kyc(
        self,
        uan_number: Optional[str] = "1009-8876-5432",
        aadhaar_last_four: Optional[str] = "8832",
        artisan_name: Optional[str] = "Radha Devi",
        state: Optional[str] = "Haryana",
    ) -> Dict[str, Any]:
        """
        Simulates e-Shram & MoSJE welfare scheme verification lookup.
        """
        clean_uan = (uan_number or "1009-8876-5432").replace(" ", "").replace("-", "")
        is_valid = len(clean_uan) == 12 or len(aadhaar_last_four or "") == 4

        schemes = [
            {
                "scheme_code": "PM-DAKSH-2026",
                "scheme_name": "Pradhan Mantri Dakshta Aur Kushalta Sampann Hitgrahi (PM-DAKSH)",
                "ministry": "Ministry of Social Justice and Empowerment (MoSJE)",
                "eligibility_status": "ENROLLED_LEVEL_4_CERTIFIED",
                "benefit_description": "Advanced Craft Upskilling, Digital Marketing Stipend & Tool Kit Subsidy",
                "annual_benefit_inr": 15000.0,
                "direct_benefit_transfer_ready": True,
            },
            {
                "scheme_code": "PM-SURAJ-CREDIT",
                "scheme_name": "Pradhan Mantri Samajik Utthan evam Rozgar Adharit Jankalyan (PM-SURAJ)",
                "ministry": "MoSJE / National Backward Classes Finance & Development Corporation",
                "eligibility_status": "CREDIT_SANCTIONED_CONCESSIONAL",
                "benefit_description": "Collateral-free working capital loan up to ₹1,00,000 at 5% interest subvention",
                "annual_benefit_inr": 35000.0,
                "direct_benefit_transfer_ready": True,
            },
            {
                "scheme_code": "PMSYM-PENSION",
                "scheme_name": "Pradhan Mantri Shram Yogi Maan-dhan (PM-SYM)",
                "ministry": "Ministry of Labour & Employment",
                "eligibility_status": "ACTIVE_CONTRIBUTION",
                "benefit_description": "Assured monthly pension of ₹3,000 after 60 years of age for unorganized craft workers",
                "annual_benefit_inr": 36000.0,
                "direct_benefit_transfer_ready": True,
            },
            {
                "scheme_code": "PEHCHAN-CARD",
                "scheme_name": "National Handicrafts Pehchan Identity Card Scheme",
                "ministry": "Ministry of Textiles (DC Handicrafts)",
                "eligibility_status": "ISSUED_GI_AUTHENTICATED",
                "benefit_description": "100% Freight subsidy for exhibitions and GeM / ONDC digital marketplace fee waiver",
                "annual_benefit_inr": 12000.0,
                "direct_benefit_transfer_ready": True,
            },
        ]

        total_benefit = sum(s["annual_benefit_inr"] for s in schemes if s["annual_benefit_inr"])

        return {
            "is_verified": is_valid,
            "uan_number": uan_number or "1009-8876-5432",
            "artisan_name": artisan_name or "Radha Devi",
            "primary_occupation": "Handloom & Folk Craft Artisan",
            "sub_category": "Traditional Handcrafted Textiles & Handicrafts",
            "state": state or "Haryana",
            "district": "Gurugram" if state == "Haryana" else "Varanasi",
            "social_category": "OBC / Beneficiary Artisan (MoSJE Target Group)",
            "kyc_status": "AADHAAR_ESHRAM_LINKED_VERIFIED",
            "active_schemes": schemes,
            "total_potential_annual_benefit_inr": total_benefit,
            "direct_payout_escrow_account": {
                "bank_name": "State Bank of India (Jan Dhan)",
                "account_mask": "XXXXXX8832",
                "ifsc_code": "SBIN0001042",
                "dbt_linked": "YES",
            },
            "verification_authority": "National e-Shram Portal & MoSJE Digital DPI Registry (Simulated Sandbox)",
        }

    def generate_logistics_dropoff_pin(
        self,
        order_id: str,
        artisan_id: str,
        origin_pincode: str = "122001",
        destination_pincode: str = "110001",
        weight_grams: int = 850,
    ) -> Dict[str, Any]:
        """
        Simulates India Post / CSC first-mile drop-off PIN and nearest CSC center dispatch info.
        """
        clean_pincode = (origin_pincode or "122001").strip()
        center = self.CSC_CENTERS_DIRECTORY.get(clean_pincode, self.CSC_CENTERS_DIRECTORY["default"])

        # Deterministic 6-digit dropoff pin
        pin_int = int(hashlib.sha256(f"{order_id}:{artisan_id}".encode("utf-8")).hexdigest()[:8], 16)
        pin_seed = pin_int % 900000 + 100000
        dropoff_pin = str(pin_seed)

        # Speed Post AWB
        awb_int = int(hashlib.sha256(order_id.encode("utf-8")).hexdigest()[:8], 16)
        awb_suffix = f"{awb_int % 90000000 + 10000000}IN"
        speed_post_awb = f"EK{awb_suffix}"

        return {
            "order_id": order_id,
            "artisan_id": artisan_id,
            "dropoff_tracking_pin": dropoff_pin,
            "speed_post_awb": speed_post_awb,
            "barcode_format": "CODE-128",
            "origin_pincode": clean_pincode,
            "nearest_csc_center_id": center["center_id"],
            "nearest_center_name": center["name"],
            "center_address": center["address"],
            "distance_km": center["distance_km"],
            "operating_hours": center["operating_hours"],
            "contact_person_vle": center["vle_name"],
            "vle_phone": center["vle_phone"],
            "transit_partner": "India Post Speed Post & CSC Rural Logistics",
            "estimated_transit_days": 2,
            "dropoff_deadline_hours": 48,
        }


mock_sandbox_service = MockSandboxService()
