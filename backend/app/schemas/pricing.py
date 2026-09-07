from typing import Optional
from pydantic import BaseModel, Field


class PricingCalculateRequest(BaseModel):
    product_id: str
    raw_material_cost: float = Field(..., ge=0)
    labor_days: float = Field(..., ge=0.5)
    daily_wage_rate: Optional[float] = Field(default=450.0, ge=200.0)


class CostBreakdown(BaseModel):
    raw_material_cost: float
    labor_days: float
    daily_wage_rate: float
    calculated_fair_wage: float
    artisan_net_profit: float
    total_suggested_price: float


class PricingCalculateResponse(BaseModel):
    product_id: str
    benchmark_min_price: float
    benchmark_max_price: float
    recommended_price: float
    cost_breakdown: CostBreakdown
    visual_complexity_factor: float
    market_benchmark_source: str
