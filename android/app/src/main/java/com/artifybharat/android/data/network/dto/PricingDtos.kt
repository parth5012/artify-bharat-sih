package com.artifybharat.android.data.network.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class CostBreakdownDto(
    @Json(name = "raw_materials") val rawMaterials: Double,
    @Json(name = "fair_wages") val fairWages: Double,
    @Json(name = "packaging_and_logistics") val packagingAndLogistics: Double,
    @Json(name = "artisan_profit") val artisanProfit: Double,
    @Json(name = "platform_fee") val platformFee: Double = 0.0
)

@JsonClass(generateAdapter = true)
data class FairWagePricingRequestDto(
    @Json(name = "raw_material_cost") val rawMaterialCost: Double,
    @Json(name = "labor_hours") val laborHours: Double,
    @Json(name = "state_code") val stateCode: String = "HR",
    @Json(name = "hourly_wage_override") val hourlyWageOverride: Double? = null,
    @Json(name = "is_gi_tagged") val isGiTagged: Boolean = false,
    @Json(name = "craft_category") val craftCategory: String = "handloom",
    @Json(name = "complexity_score") val complexityScore: Double = 0.5
)

@JsonClass(generateAdapter = true)
data class FairWagePricingResponseDto(
    @Json(name = "state_code") val stateCode: String,
    @Json(name = "state_name") val stateName: String,
    @Json(name = "hourly_wage_rate") val hourlyWageRate: Double,
    @Json(name = "statutory_floor_enforced") val statutoryFloorEnforced: Boolean,
    @Json(name = "is_gi_tagged") val isGiTagged: Boolean,
    @Json(name = "gi_heritage_multiplier") val giHeritageMultiplier: Double,
    @Json(name = "statutory_floor_price") val statutoryFloorPrice: Double,
    @Json(name = "fair_retail_price") val fairRetailPrice: Double,
    @Json(name = "bulk_wholesale_price") val bulkWholesalePrice: Double,
    @Json(name = "artisan_net_profit") val artisanNetProfit: Double,
    @Json(name = "direct_realization_percent") val directRealizationPercent: Double,
    @Json(name = "cost_breakdown") val costBreakdown: CostBreakdownDto,
    @Json(name = "pricing_formula_summary") val pricingFormulaSummary: String
)
