from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone

class MoSJEAuthRequest(BaseModel):
    artisan_id: str = Field(..., description="Artisan identifier or user ID")
    scheme_type: str = Field(..., description="Scheme name: PM-SURAJ, PM-DAKSH, e-Shram, or Pehchan")
    scheme_registration_number: str = Field(..., description="Beneficiary registration ID or certificate number")

class MoSJEAuthResponse(BaseModel):
    verified: bool
    scheme_type: str
    scheme_registration_number: str
    beneficiary_name: str
    craft_cluster: str
    state: str
    skill_certification_level: str
    stipend_eligible: bool
    verified_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    details: dict = Field(default_factory=dict)

class EShramLookupRequest(BaseModel):
    uan_number: str = Field(..., description="12-digit Universal Account Number (UAN) for e-Shram")
    mobile_last_4: Optional[str] = Field(None, description="Last 4 digits of linked mobile number")

class EShramLookupResponse(BaseModel):
    valid: bool
    uan_number: str
    worker_name: str
    primary_occupation: str
    sub_category: str
    state: str
    district: str
    social_category: str
    pension_scheme_enrolled: bool

class PMSurajLookupRequest(BaseModel):
    application_id: str = Field(..., description="PM-SURAJ credit/subsidy application ID")

class PMSurajLookupResponse(BaseModel):
    verified: bool
    application_id: str
    beneficiary_name: str
    sanctioned_amount_inr: float
    subsidy_percentage: float
    credit_status: str
    nodal_agency: str
