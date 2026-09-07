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
