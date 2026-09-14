from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class VoiceRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2)
    phone: str = Field(..., min_length=10, max_length=15)
    pin: str = Field(..., min_length=4, max_length=6)
    primary_dialect: str = Field(default="bhojpuri")
    state: str = Field(default="Uttar Pradesh")
    district: str = Field(default="Varanasi")
    cluster_name: str = Field(default="Varanasi Handloom Cluster")
    trifed_id: Optional[str] = None
    pehchan_id: Optional[str] = None
    geo_lat: Optional[float] = 25.3176
    geo_lng: Optional[float] = 82.9739


# Alias for backward compatibility
RegisterRequest = VoiceRegisterRequest


class PinLoginRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=15)
    pin: str = Field(..., min_length=4, max_length=6)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    artisan_id: str
    name: str
    phone: str


class ArtisanIdVerificationRequest(BaseModel):
    identifier_type: str = Field(
        default="pehchan", description="Identifier type: 'pehchan' or 'trifed'"
    )
    identifier_value: str = Field(
        ...,
        description="Government artisan registration string (e.g. PEH-IND-88320 or TRIFED-UP-VNS-1049)",
    )


class ArtisanIdVerificationResponse(BaseModel):
    is_valid: bool = Field(
        ..., description="Whether ID is verified in national artisan database"
    )
    identifier_type: str
    identifier_value: str
    artisan_name: Optional[str] = None
    craft_category: Optional[str] = None
    cluster_name: Optional[str] = None
    gi_certified: bool = False
    gi_tag_name: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    verification_source: str = Field(
        default="National Handicrafts & Handlooms Database (Pehchan / TRIFED Registry)"
    )


# Aliases for backward-compatibility with backend service modules
RegisterRequest = VoiceRegisterRequest
LoginRequest = PinLoginRequest

# --- US-ONB-01 Multi-Step Onboarding & Offline Sync Schemas ---


class OnboardingIdType(str, Enum):
    PEHCHAN = "pehchan"
    ESHRAM = "eshram"
    TRIFED = "trifed"
    NONE = "none"


class OnboardingStep1Request(BaseModel):
    phone: str = Field(..., pattern=r"^[6-9]\d{9}$", description="10-digit Indian mobile number")
    pin: str = Field(..., pattern=r"^\d{4}$", description="4-digit security PIN")
    dialect: str = Field(
        default="hindi", description="Artisan preferred dialect / language"
    )
    role: str = Field(default="artisan", pattern=r"^(artisan|shg_leader)$", description="Role: 'artisan' or 'shg_leader'")


class OnboardingStep1Response(BaseModel):
    session_token: str
    artisan_id: str
    phone: str
    role: str
    dialect: str
    next_step: int = 2
    message: str = "Step 1 initiated successfully."


class OnboardingStep2Request(BaseModel):
    artisan_id: str
    session_token: Optional[str] = None
    id_type: OnboardingIdType = Field(default=OnboardingIdType.NONE)
    id_number: Optional[str] = None
    manual_state: Optional[str] = None
    manual_district: Optional[str] = None
    manual_cluster: Optional[str] = None

    @field_validator("id_type", mode="before")
    @classmethod
    def normalize_id_type(cls, v):
        if isinstance(v, str):
            return v.strip().lower()
        return v


class OnboardingStep2Response(BaseModel):
    artisan_id: str
    id_type: str
    verified: bool
    cluster_name: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    next_step: int = 3
    message: str = "Step 2 completed successfully."


class OnboardingStep3Request(BaseModel):
    artisan_id: str
    session_token: Optional[str] = None
    name: str = Field(..., min_length=2, description="Full artisan or leader name")
    craft_category: Optional[str] = None
    shg_group_name: Optional[str] = None
    shg_member_count: Optional[int] = None


class OnboardingCompleteResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    artisan_id: str
    name: str
    phone: str
    role: str
    cluster_name: Optional[str] = None
    is_onboarded: bool = True
    message: str = "Onboarding completed successfully."


class OnboardingSyncRequest(BaseModel):
    phone: str = Field(..., pattern=r"^[6-9]\d{9}$", description="10-digit Indian mobile number")
    pin: str = Field(..., pattern=r"^\d{4}$", description="4-digit security PIN")
    name: str = Field(..., min_length=2, description="Full artisan name")
    session_token: Optional[str] = None
    dialect: str = Field(default="hindi")
    role: str = Field(default="artisan", pattern=r"^(artisan|shg_leader)$")
    id_type: Optional[str] = Field(default="none")
    id_number: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    cluster_name: Optional[str] = None
    craft_category: Optional[str] = None
    shg_group_name: Optional[str] = None
    shg_member_count: Optional[int] = None
    manual_state: Optional[str] = None
    manual_district: Optional[str] = None
    manual_cluster: Optional[str] = None
