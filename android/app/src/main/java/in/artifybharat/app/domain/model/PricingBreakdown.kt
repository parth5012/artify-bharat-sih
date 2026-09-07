package `in`.artifybharat.app.domain.model

data class PricingBreakdown(
    val productId: String,
    val rawMaterialCost: Double,
    val laborDays: Double,
    val dailyWageRate: Double = 450.0,
    val calculatedFairWage: Double,
    val artisanNetProfit: Double,
    val recommendedPrice: Double,
    val benchmarkMinPrice: Double,
    val benchmarkMaxPrice: Double
)
