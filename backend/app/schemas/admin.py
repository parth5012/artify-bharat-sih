from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class DistrictMetric(BaseModel):
    district_name: str
    state: str
    craft_cluster: str
    active_artisans_count: int
    direct_income_disbursed_inr: float
    gi_protection_index: float
    counterfeit_reports_resolved: int
    lat: float
    lng: float

class DistrictHeatmapResponse(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    total_districts_monitored: int
    total_artisans_registered: int
    total_wages_disbursed_inr: float
    average_middleman_savings_percent: float
    districts: List[DistrictMetric]
    is_fallback: Optional[bool] = Field(default=False, description="True if fallback mock/seed data was used because tables were empty")

class AuditLogEntry(BaseModel):
    log_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    event_type: str
    product_or_passport_id: str
    shortcode: Optional[str]
    cluster: str
    details: str
    anomaly_score: float
    status: str

class AuditLogsResponse(BaseModel):
    total_logs: int
    logs: List[AuditLogEntry]

class PMDakshMetricsResponse(BaseModel):
    total_enrolled: int
    total_certified: int
    average_wage_increase_percent: float
    master_artisan_trainers_count: int
    top_craft_sectors: List[Dict[str, Any]]

class FestivalDemandItem(BaseModel):
    festival_name: str
    surge_multiplier: float
    peak_month: str
    recommended_stock_units: int
    trending_crafts: List[str]

class DemandForecastResponse(BaseModel):
    forecast_model: str = "Artify-Bharat-Prophet-Festival-AI"
    cluster: str
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    confidence_score: float
    forecast_items: List[FestivalDemandItem]
    actionable_cluster_advisory: str
