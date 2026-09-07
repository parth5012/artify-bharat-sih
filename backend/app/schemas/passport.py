from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.pricing import CostBreakdown


class PassportIssueRequest(BaseModel):
    product_id: str


class HeritagePassportResponse(BaseModel):
    product_id: str
    passport_hash: str
    qr_code_data_uri: str
    verification_url: str
    issued_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PublicPassportVerification(BaseModel):
    passport_hash: str
    is_authentic: bool
    product_title: str
    craft_category: str
    gi_tag_status: str
    artisan_name: str
    cluster_name: str
    state: str
    district: str
    trifed_id: Optional[str]
    pehchan_id: Optional[str]
    geo_coordinates: Dict[str, Optional[float]]
    enhanced_image_url: Optional[str]
    voice_story_url: Optional[str]
    cost_breakdown: CostBreakdown
    issued_at: datetime
