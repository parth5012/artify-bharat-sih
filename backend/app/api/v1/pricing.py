from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.services.pricing_service import pricing_service
from app.models.product import Product
from app.models.pricing import ProductPricing
from app.schemas.pricing import PricingCalculateRequest, PricingCalculateResponse, CostBreakdown

router = APIRouter(prefix="/pricing", tags=["Dynamic Pricing Engine"])


@router.post("/calculate", response_model=PricingCalculateResponse)
async def calculate_dynamic_pricing(payload: PricingCalculateRequest, db: AsyncSession = Depends(get_db)):
    """
    Page 5: Dynamic Pricing Engine.
    Correlates raw material cost, labor days invested, visual complexity, and market benchmarks.
    Produces fair wage protection breakdown and recommended price window.
    """
    stmt = select(Product).where(Product.id == payload.product_id)
    res = await db.execute(stmt)
    product = res.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    # Run Pricing Service
    pricing_result = pricing_service.calculate_pricing(
        raw_material_cost=payload.raw_material_cost,
        labor_days=payload.labor_days,
        visual_complexity=product.visual_complexity_score,
        craft_category=product.craft_category,
        daily_wage_rate=payload.daily_wage_rate or 450.0,
    )

    cost_info = pricing_result["cost_breakdown"]

    # Upsert ProductPricing model
    pricing_stmt = select(ProductPricing).where(ProductPricing.product_id == product.id)
    p_res = await db.execute(pricing_stmt)
    existing_pricing = p_res.scalar_one_or_none()

    if existing_pricing:
        existing_pricing.raw_material_cost = payload.raw_material_cost
        existing_pricing.labor_days = payload.labor_days
        existing_pricing.daily_fair_wage_rate = cost_info["daily_wage_rate"]
        existing_pricing.calculated_fair_wage = cost_info["calculated_fair_wage"]
        existing_pricing.benchmark_min_price = pricing_result["benchmark_min_price"]
        existing_pricing.benchmark_max_price = pricing_result["benchmark_max_price"]
        existing_pricing.recommended_price = pricing_result["recommended_price"]
        existing_pricing.final_price = pricing_result["recommended_price"]
        existing_pricing.artisan_net_profit = cost_info["artisan_net_profit"]
    else:
        pricing_record = ProductPricing(
            product_id=product.id,
            raw_material_cost=payload.raw_material_cost,
            labor_days=payload.labor_days,
            daily_fair_wage_rate=cost_info["daily_wage_rate"],
            calculated_fair_wage=cost_info["calculated_fair_wage"],
            benchmark_min_price=pricing_result["benchmark_min_price"],
            benchmark_max_price=pricing_result["benchmark_max_price"],
            recommended_price=pricing_result["recommended_price"],
            final_price=pricing_result["recommended_price"],
            artisan_net_profit=cost_info["artisan_net_profit"],
            model_metadata={"source": pricing_result["market_benchmark_source"]},
        )
        db.add(pricing_record)

    product.status = "priced"
    await db.commit()

    return PricingCalculateResponse(
        product_id=product.id,
        benchmark_min_price=pricing_result["benchmark_min_price"],
        benchmark_max_price=pricing_result["benchmark_max_price"],
        recommended_price=pricing_result["recommended_price"],
        cost_breakdown=CostBreakdown(**cost_info),
        visual_complexity_factor=product.visual_complexity_score,
        market_benchmark_source=pricing_result["market_benchmark_source"],
    )
