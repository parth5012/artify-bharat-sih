from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class WelfareScheme(BaseModel):
    scheme_code: str
    scheme_name: str
    ministry: str
    eligibility_status: str
    benefit_description: str
    annual_benefit_inr: Optional[float] = None
    direct_benefit_transfer_ready: bool = True


class EShramKYCRequest(BaseModel):
    uan_number: Optional[str] = Field(
        default="1009-8876-5432",
        description="12-digit Universal Account Number (UAN) from e-Shram portal",
    )
    aadhaar_last_four: Optional[str] = Field(
        default="8832",
        description="Last 4 digits of artisan Aadhaar card",
    )
    artisan_name: Optional[str] = Field(
        default="Radha Devi",
        description="Full name of the artisan / worker",
    )
    state: Optional[str] = Field(
        default="Haryana",
        description="State of origin",
    )


class EShramKYCResponse(BaseModel):
    is_verified: bool
    uan_number: str
    artisan_name: str
    primary_occupation: str
    sub_category: str
    state: str
    district: str
    social_category: str
    kyc_status: str
    active_schemes: List[WelfareScheme]
    total_potential_annual_benefit_inr: float
    direct_payout_escrow_account: Dict[str, str]
    verification_authority: str


class MockLogisticsPinRequest(BaseModel):
    order_id: str = Field(..., description="Unique order identifier", examples=["ORD-2026-9081"])
    artisan_id: str = Field(..., description="Artisan identifier", examples=["ART-HR-9921"])
    origin_pincode: str = Field(default="122001", description="6-digit postal PIN code of artisan workshop/village", examples=["122001"])
    destination_pincode: Optional[str] = Field(default="110001", description="Buyer / Hub delivery pincode", examples=["110001"])
    weight_grams: Optional[int] = Field(default=850, description="Gross parcel weight in grams")


class MockLogisticsPinResponse(BaseModel):
    order_id: str
    artisan_id: str
    dropoff_tracking_pin: str
    speed_post_awb: str
    barcode_format: str
    origin_pincode: str
    nearest_csc_center_id: str
    nearest_center_name: str
    center_address: str
    distance_km: float
    operating_hours: str
    contact_person_vle: str
    vle_phone: str
    transit_partner: str
    estimated_transit_days: int
    dropoff_deadline_hours: int
