from typing import Optional, Dict
from pydantic import BaseModel, Field


class CostBreakdown(BaseModel):
    raw_material_cost: float = Field(..., description="Direct raw materials input cost (in INR)")
    labor_days: Optional[float] = Field(None, description="Labor invested in days")
    labor_hours: Optional[float] = Field(None, description="Labor invested in hours")
    daily_wage_rate: Optional[float] = Field(None, description="Effective statutory daily wage rate (in INR)")
    hourly_wage_rate: Optional[float] = Field(None, description="Effective hourly wage rate applied (in INR)")
    calculated_fair_wage: float = Field(..., description="Total labor wage guaranteed to artisan")
    packaging_overhead: float = Field(default=150.0, description="Packaging, transit & first-mile logistics overhead")
    artisan_net_profit: float = Field(..., description="Net margin/profit realized directly by artisan")
    total_suggested_price: float = Field(..., description="Fair suggested retail price")


class PricingCalculateRequest(BaseModel):
    product_id: str
    raw_material_cost: float = Field(..., ge=0, description="Raw material costs in INR")
    labor_days: float = Field(..., ge=0.25, description="Number of labor days invested")
    daily_wage_rate: Optional[float] = Field(default=450.0, ge=200.0, description="Daily wage benchmark")


class PricingCalculateResponse(BaseModel):
    product_id: str
    benchmark_min_price: float
    benchmark_max_price: float
    recommended_price: float
    cost_breakdown: CostBreakdown
    visual_complexity_factor: float
    market_benchmark_source: str


class FairWagePricingRequest(BaseModel):
    raw_material_cost: float = Field(..., ge=0, description="Raw material costs in INR", examples=[450.0])
    labor_hours: float = Field(..., gt=0, description="Total labor hours invested in crafting the item", examples=[8.0])
    state_code: str = Field(default="HR", description="2-letter Indian State code (e.g. HR for Haryana, UP, DL, MH, KA, BR, RJ)", examples=["HR"])
    hourly_wage_override: Optional[float] = Field(None, ge=50.0, description="Optional custom hourly wage override")
    is_gi_tagged: bool = Field(default=False, description="Whether product has Geographical Indication (GI) certification (applies 1.15x heritage multiplier)")
    craft_category: Optional[str] = Field(default="handloom", description="Craft category: handloom, pottery, woodcraft, metalwork, embroidery, painting")
    visual_complexity: Optional[float] = Field(default=0.75, ge=0.0, le=1.0, description="Visual complexity score from CV Studio (0.0 to 1.0)")


class FairWagePricingResponse(BaseModel):
    state_code: str
    state_name: str
    hourly_wage_rate: float
    statutory_floor_enforced: bool
    is_gi_tagged: bool
    gi_heritage_multiplier: float
    statutory_floor_price: float
    fair_retail_price: float
    bulk_wholesale_price: float
    artisan_net_profit: float
    direct_realization_percent: float
    cost_breakdown: CostBreakdown
    pricing_formula_summary: str
