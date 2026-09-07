from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ArtisanBase(BaseModel):
    name: str
    phone: str
    primary_dialect: str = "bhojpuri"
    state: str = "Uttar Pradesh"
    district: str = "Varanasi"
    cluster_name: str = "Varanasi Handloom Cluster"
    trifed_id: Optional[str] = None
    pehchan_id: Optional[str] = None
    geo_lat: Optional[float] = None
    geo_lng: Optional[float] = None
    is_verified: bool = True


class ArtisanResponse(ArtisanBase):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
