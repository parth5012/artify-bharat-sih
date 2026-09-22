from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class ExportChannelRequest(BaseModel):
    product_id: str
    target_channels: List[str] = Field(
        default_factory=lambda: ["GeM", "ONDC", "Amazon_Karigar", "Direct_B2B"]
    )
    b2b_bulk_min_quantity: Optional[int] = 10
    b2b_bulk_discount_percentage: Optional[float] = 15.0


class ChannelExportResult(BaseModel):
    channel: str
    status: str
    external_reference_id: str
    format: str  # "XML", "JSON_BECKN", "REST_API"
    details: Dict[str, Any]


class ExportChannelResponse(BaseModel):
    product_id: str
    passport_hash: str
    results: List[ChannelExportResult]
    message: str
