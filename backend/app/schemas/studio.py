from typing import Optional
from pydantic import BaseModel


class StudioEnhanceResponse(BaseModel):
    product_id: str
    raw_image_url: str
    enhanced_image_url: str
    visual_complexity_score: float
    auto_cropped_ratio: str = "1:1"
    status: str
    message: str
