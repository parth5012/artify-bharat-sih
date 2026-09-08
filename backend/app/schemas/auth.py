from typing import Optional
from pydantic import BaseModel, Field


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
    identifier_type: str = Field(default="pehchan", description="Identifier type: 'pehchan' or 'trifed'")
    identifier_value: str = Field(..., description="Government artisan registration string (e.g. PEH-IND-88320 or TRIFED-UP-VNS-1049)")


class ArtisanIdVerificationResponse(BaseModel):
    is_valid: bool = Field(..., description="Whether ID is verified in national artisan database")
    identifier_type: str
    identifier_value: str
    artisan_name: Optional[str] = None
    craft_category: Optional[str] = None
    cluster_name: Optional[str] = None
    gi_certified: bool = False
    gi_tag_name: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    verification_source: str = Field(default="National Handicrafts & Handlooms Database (Pehchan / TRIFED Registry)")
